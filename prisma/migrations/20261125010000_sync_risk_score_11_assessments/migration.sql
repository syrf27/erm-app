-- Stored assessment levels must follow the corrected matrix cell.
UPDATE "AnalisisRisiko" AS analysis
SET "levelRisikoId" = 2
FROM "MatriksAnalisisRisiko" AS matrix
WHERE matrix."besaran" = 11
  AND analysis."levelKemungkinanId" = matrix."levelKemungkinanId"
  AND analysis."levelDampakId" = matrix."levelDampakId"
  AND analysis."levelRisikoId" = 3;

UPDATE "EvaluasiRisiko" AS evaluation
SET "residualLevelRisikoId" = 2
FROM "MatriksAnalisisRisiko" AS matrix
WHERE matrix."besaran" = 11
  AND evaluation."residualLevelKemungkinanId" = matrix."levelKemungkinanId"
  AND evaluation."residualLevelDampakId" = matrix."levelDampakId"
  AND evaluation."residualLevelRisikoId" = 3;
