-- To run this query manually, uncomment these declarations and set your filters.
-- Leave either value NULL to include every species or island.
-- DECLARE @species NVARCHAR(30) = NULL; -- for example, N'Gentoo'
-- DECLARE @island NVARCHAR(30) = NULL;  -- for example, N'Biscoe'

SELECT
    p.PenguinID AS id,
    species.SpeciesName AS species,
    islands.IslandName AS island,
    p.BillLengthMM AS billLength,
    p.BillDepthMM AS billDepth,
    p.FlipperLengthMM AS flipperLength,
    p.BodyMassG AS bodyMass
FROM dbo.Penguins AS p
INNER JOIN dbo.PenguinSpecies AS species
    ON species.SpeciesID = p.SpeciesID
INNER JOIN dbo.Islands AS islands
    ON islands.IslandID = p.IslandID
WHERE
    (@species IS NULL OR species.SpeciesName = @species)
    AND (@island IS NULL OR islands.IslandName = @island)
ORDER BY
    species.SpeciesName,
    islands.IslandName,
    p.StudyYear,
    p.PenguinID;
