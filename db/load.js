require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const sql = require('mssql');

const csvUrl = 'https://raw.githubusercontent.com/rfordatascience/tidytuesday/main/data/2020/2020-07-28/penguins.csv';
const expectedHeaders = [
  'species',
  'island',
  'bill_length_mm',
  'bill_depth_mm',
  'flipper_length_mm',
  'body_mass_g',
  'sex',
  'year'
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some(value => value.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (inQuotes) throw new Error('The downloaded CSV contains an unfinished quoted field.');
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some(value => value.trim() !== '')) rows.push(row);
  }
  return rows;
}

function parseNumber(value, column, rowNumber) {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'NA') return null;
  const number = Number(trimmed);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid ${column} value in CSV row ${rowNumber}.`);
  }
  return number;
}

function readPenguins(csvText) {
  const rows = parseCsv(csvText);
  const headers = rows.shift()?.map(value => value.replace(/^\uFEFF/, '').trim());
  if (!headers || headers.join(',') !== expectedHeaders.join(',')) {
    throw new Error('The downloaded CSV has an unexpected header.');
  }

  return rows.map((row, index) => {
    const rowNumber = index + 2;
    if (row.length !== expectedHeaders.length) {
      throw new Error(`CSV row ${rowNumber} has ${row.length} fields; expected ${expectedHeaders.length}.`);
    }

    const [species, island, billLength, billDepth, flipperLength, bodyMass, sex, year] = row.map(value => value.trim());
    if (!species || species === 'NA' || !island || island === 'NA') {
      throw new Error(`CSV row ${rowNumber} is missing its species or island.`);
    }

    const normalizedSex = sex === '' || sex === 'NA' ? null : sex.toLowerCase();
    if (normalizedSex !== null && normalizedSex !== 'male' && normalizedSex !== 'female') {
      throw new Error(`Invalid sex value in CSV row ${rowNumber}.`);
    }

    const studyYear = parseNumber(year, 'year', rowNumber);
    if (!Number.isInteger(studyYear)) {
      throw new Error(`Invalid year value in CSV row ${rowNumber}.`);
    }

    return {
      species,
      island,
      billLength: parseNumber(billLength, 'bill_length_mm', rowNumber),
      billDepth: parseNumber(billDepth, 'bill_depth_mm', rowNumber),
      flipperLength: parseNumber(flipperLength, 'flipper_length_mm', rowNumber),
      bodyMass: parseNumber(bodyMass, 'body_mass_g', rowNumber),
      sex: normalizedSex,
      studyYear
    };
  });
}

function chooseSample(penguins, targetCount) {
  const groups = new Map();
  for (const penguin of penguins) {
    if (!groups.has(penguin.species)) groups.set(penguin.species, []);
    groups.get(penguin.species).push(penguin);
  }

  const speciesGroups = [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
  const sample = [];
  speciesGroups.forEach(([, group], groupIndex) => {
    const count = Math.min(
      group.length,
      Math.floor(targetCount / speciesGroups.length) +
        (groupIndex < targetCount % speciesGroups.length ? 1 : 0)
    );
    for (let index = 0; index < count; index += 1) {
      const sourceIndex = Math.floor((index + 0.5) * group.length / count);
      sample.push(group[sourceIndex]);
    }
  });
  return sample;
}

async function main() {
  const requiredSettings = ['DB_SERVER', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missingSettings = requiredSettings.filter(name => !process.env[name]);
  if (missingSettings.length > 0) {
    throw new Error(`Missing database setting(s) in .env: ${missingSettings.join(', ')}.`);
  }

  const response = await fetch(csvUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(`Could not download the penguin CSV (HTTP ${response.status}).`);
  }
  const penguins = chooseSample(readPenguins(await response.text()), 20);
  if (penguins.length === 0) throw new Error('The downloaded CSV contains no penguin rows.');

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const pool = new sql.ConnectionPool({
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT || 1433),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    options: { encrypt: true, trustServerCertificate: true }
  });

  try {
    await pool.connect();
    await pool.request().batch(schema);

    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await new sql.Request(transaction).query(`
        DELETE FROM dbo.Penguins;
        DELETE FROM dbo.Islands;
        DELETE FROM dbo.PenguinSpecies;
      `);

      const speciesNames = [...new Set(penguins.map(penguin => penguin.species))];
      for (const name of speciesNames) {
        await new sql.Request(transaction)
          .input('name', sql.NVarChar(30), name)
          .query('INSERT INTO dbo.PenguinSpecies (SpeciesName) VALUES (@name);');
      }

      const islandNames = [...new Set(penguins.map(penguin => penguin.island))];
      for (const name of islandNames) {
        await new sql.Request(transaction)
          .input('name', sql.NVarChar(30), name)
          .query('INSERT INTO dbo.Islands (IslandName) VALUES (@name);');
      }

      const speciesResult = await new sql.Request(transaction)
        .query('SELECT SpeciesID, SpeciesName FROM dbo.PenguinSpecies;');
      const islandResult = await new sql.Request(transaction)
        .query('SELECT IslandID, IslandName FROM dbo.Islands;');
      const speciesIds = new Map(speciesResult.recordset.map(row => [row.SpeciesName, row.SpeciesID]));
      const islandIds = new Map(islandResult.recordset.map(row => [row.IslandName, row.IslandID]));

      const table = new sql.Table('dbo.Penguins');
      table.create = false;
      table.columns.add('SpeciesID', sql.Int, { nullable: false });
      table.columns.add('IslandID', sql.Int, { nullable: false });
      table.columns.add('BillLengthMM', sql.Decimal(5, 1), { nullable: true });
      table.columns.add('BillDepthMM', sql.Decimal(4, 1), { nullable: true });
      table.columns.add('FlipperLengthMM', sql.SmallInt, { nullable: true });
      table.columns.add('BodyMassG', sql.SmallInt, { nullable: true });
      table.columns.add('Sex', sql.NVarChar(10), { nullable: true });
      table.columns.add('StudyYear', sql.SmallInt, { nullable: false });

      for (const penguin of penguins) {
        table.rows.add(
          speciesIds.get(penguin.species),
          islandIds.get(penguin.island),
          penguin.billLength,
          penguin.billDepth,
          penguin.flipperLength,
          penguin.bodyMass,
          penguin.sex,
          penguin.studyYear
        );
      }

      await new sql.Request(transaction).bulk(table);
      await transaction.commit();
      console.log(`Loaded ${penguins.length} penguins, ${speciesNames.length} species, and ${islandNames.length} islands into ${process.env.DB_NAME}.`);
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Could not roll back the dataset load:', rollbackError.message);
      }
      throw error;
    }
  } finally {
    if (pool.connected) await pool.close();
  }
}

main().catch(error => {
  console.error('Penguin data load failed:', error.message);
  process.exitCode = 1;
});
