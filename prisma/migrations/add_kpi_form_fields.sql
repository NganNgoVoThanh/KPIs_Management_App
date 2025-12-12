-- Migration: Add KPI Form Fields
-- Date: 2025-10-23
-- Description: Add additional fields to support enhanced KPI form

-- Add new columns to kpi_definitions table
ALTER TABLE `kpi_definitions`
ADD COLUMN `category` VARCHAR(191) NULL AFTER `scoringRules`,
ADD COLUMN `ogsmAlignment` TEXT NULL AFTER `category`,
ADD COLUMN `frequency` VARCHAR(191) NULL AFTER `ogsmAlignment`,
ADD COLUMN `priority` VARCHAR(191) NULL AFTER `frequency`,
ADD COLUMN `dependencies` TEXT NULL AFTER `priority`,
ADD COLUMN `evidenceRequirements` TEXT NULL AFTER `dependencies`,
ADD COLUMN `startDate` DATETIME(3) NULL AFTER `evidenceRequirements`,
ADD COLUMN `dueDate` DATETIME(3) NULL AFTER `startDate`;

-- Add indexes for better query performance
CREATE INDEX `kpi_definitions_category_idx` ON `kpi_definitions`(`category`);
CREATE INDEX `kpi_definitions_priority_idx` ON `kpi_definitions`(`priority`);

-- Update any existing records with default values if needed
UPDATE `kpi_definitions`
SET
  `frequency` = 'Quarterly',
  `priority` = 'Medium'
WHERE `frequency` IS NULL OR `priority` IS NULL;