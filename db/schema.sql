IF OBJECT_ID(N'dbo.PenguinSpecies', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PenguinSpecies (
        SpeciesID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_PenguinSpecies PRIMARY KEY,
        SpeciesName NVARCHAR(30) NOT NULL
            CONSTRAINT UQ_PenguinSpecies_SpeciesName UNIQUE
    );
END;

IF OBJECT_ID(N'dbo.Islands', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Islands (
        IslandID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Islands PRIMARY KEY,
        IslandName NVARCHAR(30) NOT NULL
            CONSTRAINT UQ_Islands_IslandName UNIQUE
    );
END;

IF OBJECT_ID(N'dbo.Penguins', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Penguins (
        PenguinID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Penguins PRIMARY KEY,
        SpeciesID INT NOT NULL,
        IslandID INT NOT NULL,
        BillLengthMM DECIMAL(5,1) NULL,
        BillDepthMM DECIMAL(4,1) NULL,
        FlipperLengthMM SMALLINT NULL,
        BodyMassG SMALLINT NULL,
        Sex NVARCHAR(10) NULL,
        StudyYear SMALLINT NOT NULL,
        CONSTRAINT FK_Penguins_PenguinSpecies
            FOREIGN KEY (SpeciesID) REFERENCES dbo.PenguinSpecies (SpeciesID),
        CONSTRAINT FK_Penguins_Islands
            FOREIGN KEY (IslandID) REFERENCES dbo.Islands (IslandID),
        CONSTRAINT CK_Penguins_Sex
            CHECK (Sex IS NULL OR Sex IN (N'male', N'female'))
    );
END;
