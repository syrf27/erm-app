-- Align the live matrix with the risk level range: score 11 is Rendah (green).
UPDATE "LevelRisiko" SET "rentang" = '6 - 11' WHERE "id" = 2;
UPDATE "LevelRisiko" SET "rentang" = '12 - 14' WHERE "id" = 3;
UPDATE "MatriksAnalisisRisiko" SET "levelRisikoId" = 2 WHERE "besaran" = 11;
