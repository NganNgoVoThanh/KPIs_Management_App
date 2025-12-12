-- ===================================================================
-- KPI Management System - Complete Database Migration
-- Database: MySQL 8.0+
-- Date: 2025-10-23
-- ===================================================================

-- Drop existing tables if they exist (BE CAREFUL in production!)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `proxy_actions`;
DROP TABLE IF EXISTS `historical_kpi_data`;
DROP TABLE IF EXISTS `evidences`;
DROP TABLE IF EXISTS `company_documents`;
DROP TABLE IF EXISTS `change_requests`;
DROP TABLE IF EXISTS `approval_hierarchies`;
DROP TABLE IF EXISTS `approvals`;
DROP TABLE IF EXISTS `kpi_actuals`;
DROP TABLE IF EXISTS `kpi_definitions`;
DROP TABLE IF EXISTS `kpi_templates`;
DROP TABLE IF EXISTS `kpi_library_entries`;
DROP TABLE IF EXISTS `cycles`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `org_units`;
SET FOREIGN_KEY_CHECKS = 1;

-- ===================================================================
-- 1. ORG UNITS TABLE
-- ===================================================================
CREATE TABLE `org_units` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `parentId` VARCHAR(191) NULL,
  `type` VARCHAR(191) NOT NULL COMMENT 'COMPANY, DEPARTMENT, TEAM, GROUP',
  `managerId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX `org_units_parentId_idx` (`parentId`),
  FOREIGN KEY (`parentId`) REFERENCES `org_units`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 2. USERS TABLE
-- ===================================================================
CREATE TABLE `users` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `name` VARCHAR(191) NOT NULL,
  `role` VARCHAR(191) NOT NULL COMMENT 'ADMIN, STAFF, LINE_MANAGER, MANAGER',
  `orgUnitId` VARCHAR(191) NOT NULL,
  `department` VARCHAR(191) NULL,
  `employeeId` VARCHAR(191) NULL UNIQUE,
  `managerId` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `locale` VARCHAR(191) NOT NULL DEFAULT 'vi-VN',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `lastLoginAt` DATETIME(3) NULL,

  INDEX `users_email_idx` (`email`),
  INDEX `users_orgUnitId_idx` (`orgUnitId`),
  INDEX `users_role_idx` (`role`),
  INDEX `users_managerId_idx` (`managerId`),
  FOREIGN KEY (`orgUnitId`) REFERENCES `org_units`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`managerId`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 3. CYCLES TABLE
-- ===================================================================
CREATE TABLE `cycles` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL COMMENT 'QUARTERLY, YEARLY, SEMI_ANNUAL, MONTHLY',
  `periodStart` DATETIME(3) NOT NULL,
  `periodEnd` DATETIME(3) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
  `createdBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `openedAt` DATETIME(3) NULL,
  `closedAt` DATETIME(3) NULL,
  `notificationSentAt` DATETIME(3) NULL,
  `targetUsers` JSON NULL,
  `settings` JSON NULL,

  INDEX `cycles_status_idx` (`status`),
  INDEX `cycles_createdBy_idx` (`createdBy`),
  INDEX `cycles_periodStart_idx` (`periodStart`),
  INDEX `cycles_periodEnd_idx` (`periodEnd`),
  FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 4. KPI TEMPLATES TABLE
-- ===================================================================
CREATE TABLE `kpi_templates` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `department` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `kpiFields` JSON NOT NULL,
  `defaultWeights` JSON NULL,
  `createdBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,

  INDEX `kpi_templates_department_idx` (`department`),
  INDEX `kpi_templates_isActive_idx` (`isActive`),
  FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 5. KPI DEFINITIONS TABLE (Enhanced with all fields)
-- ===================================================================
CREATE TABLE `kpi_definitions` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `cycleId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `orgUnitId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `type` VARCHAR(191) NOT NULL,
  `unit` VARCHAR(191) NOT NULL,
  `target` DOUBLE NOT NULL,
  `formula` TEXT NULL,
  `weight` DOUBLE NOT NULL,
  `dataSource` VARCHAR(191) NULL,
  `ownerId` VARCHAR(191) NOT NULL,
  `contributors` JSON NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
  `createdFromTemplateId` VARCHAR(191) NULL,
  `scoringRules` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `submittedAt` DATETIME(3) NULL,
  `approvedAt` DATETIME(3) NULL,
  `lockedAt` DATETIME(3) NULL,

  -- Enhanced Fields
  `category` VARCHAR(191) NULL COMMENT 'Business Objective, Individual Development, Core Values',
  `ogsmAlignment` TEXT NULL,
  `frequency` VARCHAR(191) NULL COMMENT 'Monthly, Quarterly, Annually',
  `priority` VARCHAR(191) NULL COMMENT 'High, Medium, Low',
  `dependencies` TEXT NULL,
  `evidenceRequirements` TEXT NULL,
  `startDate` DATETIME(3) NULL,
  `dueDate` DATETIME(3) NULL,

  -- Approval Tracking
  `approvedByLevel1` VARCHAR(191) NULL,
  `approvedAtLevel1` DATETIME(3) NULL,
  `approvedByLevel2` VARCHAR(191) NULL,
  `approvedAtLevel2` DATETIME(3) NULL,

  -- Rejection Tracking
  `rejectedBy` VARCHAR(191) NULL,
  `rejectedAt` DATETIME(3) NULL,
  `rejectionReason` TEXT NULL,

  -- Change Request Tracking
  `changeRequestedBy` VARCHAR(191) NULL,
  `changeRequestedAt` DATETIME(3) NULL,
  `changeRequestReason` TEXT NULL,

  INDEX `kpi_definitions_cycleId_idx` (`cycleId`),
  INDEX `kpi_definitions_userId_idx` (`userId`),
  INDEX `kpi_definitions_orgUnitId_idx` (`orgUnitId`),
  INDEX `kpi_definitions_status_idx` (`status`),
  INDEX `kpi_definitions_cycleId_userId_idx` (`cycleId`, `userId`),
  INDEX `kpi_definitions_category_idx` (`category`),
  INDEX `kpi_definitions_priority_idx` (`priority`),
  FOREIGN KEY (`cycleId`) REFERENCES `cycles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`orgUnitId`) REFERENCES `org_units`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`createdFromTemplateId`) REFERENCES `kpi_templates`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 6. KPI ACTUALS TABLE
-- ===================================================================
CREATE TABLE `kpi_actuals` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `kpiDefinitionId` VARCHAR(191) NOT NULL,
  `actualValue` DOUBLE NOT NULL,
  `percentage` DOUBLE NOT NULL,
  `score` DOUBLE NOT NULL,
  `selfComment` TEXT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
  `submittedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `approvedAt` DATETIME(3) NULL,
  `approvedBy` VARCHAR(191) NULL,
  `rejectedAt` DATETIME(3) NULL,
  `rejectedBy` VARCHAR(191) NULL,
  `rejectionReason` TEXT NULL,
  `lastModifiedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `kpi_actuals_kpiDefinitionId_idx` (`kpiDefinitionId`),
  INDEX `kpi_actuals_status_idx` (`status`),
  FOREIGN KEY (`kpiDefinitionId`) REFERENCES `kpi_definitions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 7. APPROVALS TABLE
-- ===================================================================
CREATE TABLE `approvals` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `kpiDefinitionId` VARCHAR(191) NULL,
  `actualId` VARCHAR(191) NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `level` INT NOT NULL,
  `approverId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `comment` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `decidedAt` DATETIME(3) NULL,
  `reassignedBy` VARCHAR(191) NULL,
  `reassignedAt` DATETIME(3) NULL,
  `reassignReason` TEXT NULL,

  INDEX `approvals_entityId_idx` (`entityId`),
  INDEX `approvals_entityType_idx` (`entityType`),
  INDEX `approvals_approverId_idx` (`approverId`),
  INDEX `approvals_status_idx` (`status`),
  INDEX `approvals_approverId_status_idx` (`approverId`, `status`),
  FOREIGN KEY (`kpiDefinitionId`) REFERENCES `kpi_definitions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`actualId`) REFERENCES `kpi_actuals`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approverId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 8. CHANGE REQUESTS TABLE
-- ===================================================================
CREATE TABLE `change_requests` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `kpiDefinitionId` VARCHAR(191) NOT NULL,
  `requesterId` VARCHAR(191) NOT NULL,
  `requesterType` VARCHAR(191) NOT NULL,
  `changeType` VARCHAR(191) NOT NULL,
  `currentValues` JSON NOT NULL,
  `proposedValues` JSON NOT NULL,
  `reason` TEXT NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `resolvedAt` DATETIME(3) NULL,
  `resolvedBy` VARCHAR(191) NULL,
  `resolutionComment` TEXT NULL,
  `requiresApproval` BOOLEAN NOT NULL DEFAULT FALSE,
  `approvalWorkflow` JSON NULL,

  INDEX `change_requests_kpiDefinitionId_idx` (`kpiDefinitionId`),
  INDEX `change_requests_requesterId_idx` (`requesterId`),
  INDEX `change_requests_status_idx` (`status`),
  FOREIGN KEY (`kpiDefinitionId`) REFERENCES `kpi_definitions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 9. APPROVAL HIERARCHIES TABLE
-- ===================================================================
CREATE TABLE `approval_hierarchies` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(191) NOT NULL,
  `level1ApproverId` VARCHAR(191) NULL,
  `level2ApproverId` VARCHAR(191) NULL,
  `effectiveFrom` DATETIME(3) NOT NULL,
  `effectiveTo` DATETIME(3) NULL,
  `createdBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,

  INDEX `approval_hierarchies_userId_idx` (`userId`),
  INDEX `approval_hierarchies_isActive_idx` (`isActive`),
  INDEX `approval_hierarchies_userId_isActive_idx` (`userId`, `isActive`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`level1ApproverId`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`level2ApproverId`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 10. EVIDENCES TABLE
-- ===================================================================
CREATE TABLE `evidences` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `actualId` VARCHAR(191) NOT NULL,
  `provider` VARCHAR(191) NOT NULL DEFAULT 'M365' COMMENT 'M365 or S3',
  `providerRef` VARCHAR(191) NOT NULL COMMENT 'driveItemId or S3 key',
  `siteId` VARCHAR(191) NULL,
  `driveId` VARCHAR(191) NULL,
  `fileHash` VARCHAR(191) NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `fileSize` INT NOT NULL,
  `fileType` VARCHAR(191) NOT NULL,
  `uploadedBy` VARCHAR(191) NOT NULL,
  `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `description` TEXT NULL,
  `sharedAccess` BOOLEAN NOT NULL DEFAULT FALSE,
  `category` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `virusScanStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `virusScanAt` DATETIME(3) NULL,

  INDEX `evidences_actualId_idx` (`actualId`),
  INDEX `evidences_provider_idx` (`provider`),
  FOREIGN KEY (`actualId`) REFERENCES `kpi_actuals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 11. COMPANY DOCUMENTS TABLE
-- ===================================================================
CREATE TABLE `company_documents` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `title` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `fileSize` INT NOT NULL,
  `fileType` VARCHAR(191) NOT NULL,
  `storageUrl` TEXT NOT NULL,
  `department` VARCHAR(191) NULL,
  `uploadedBy` VARCHAR(191) NOT NULL,
  `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `tags` JSON NULL,
  `description` TEXT NULL,
  `isPublic` BOOLEAN NOT NULL DEFAULT TRUE,
  `aiIndexed` BOOLEAN NOT NULL DEFAULT FALSE,
  `aiIndexedAt` DATETIME(3) NULL,

  INDEX `company_documents_type_idx` (`type`),
  INDEX `company_documents_aiIndexed_idx` (`aiIndexed`),
  INDEX `company_documents_department_idx` (`department`),
  FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 12. KPI LIBRARY ENTRIES TABLE
-- ===================================================================
CREATE TABLE `kpi_library_entries` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `stt` INT NOT NULL,
  `ogsmTarget` TEXT NOT NULL,
  `department` VARCHAR(191) NOT NULL,
  `jobTitle` VARCHAR(191) NOT NULL,
  `kpiName` VARCHAR(191) NOT NULL,
  `kpiType` VARCHAR(191) NOT NULL,
  `unit` VARCHAR(191) NOT NULL,
  `dataSource` VARCHAR(191) NOT NULL,
  `yearlyTarget` VARCHAR(191) NULL,
  `quarterlyTarget` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `uploadedBy` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `version` INT NOT NULL DEFAULT 1,
  `isTemplate` BOOLEAN NOT NULL DEFAULT TRUE,

  INDEX `kpi_library_entries_department_idx` (`department`),
  INDEX `kpi_library_entries_jobTitle_idx` (`jobTitle`),
  INDEX `kpi_library_entries_status_idx` (`status`),
  INDEX `kpi_library_entries_kpiType_idx` (`kpiType`),
  FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 13. PROXY ACTIONS TABLE
-- ===================================================================
CREATE TABLE `proxy_actions` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `actionType` VARCHAR(191) NOT NULL,
  `performedBy` VARCHAR(191) NOT NULL,
  `performedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `targetUserId` VARCHAR(191) NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `level` INT NULL,
  `reason` TEXT NOT NULL,
  `comment` TEXT NULL,
  `previousApproverId` VARCHAR(191) NULL,
  `newApproverId` VARCHAR(191) NULL,
  `metadata` JSON NULL,

  INDEX `proxy_actions_performedBy_idx` (`performedBy`),
  INDEX `proxy_actions_entityId_idx` (`entityId`),
  INDEX `proxy_actions_actionType_idx` (`actionType`),
  INDEX `proxy_actions_performedAt_idx` (`performedAt`),
  FOREIGN KEY (`performedBy`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 14. NOTIFICATIONS TABLE
-- ===================================================================
CREATE TABLE `notifications` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `priority` VARCHAR(191) NOT NULL DEFAULT 'MEDIUM',
  `status` VARCHAR(191) NOT NULL DEFAULT 'UNREAD',
  `actionRequired` BOOLEAN NOT NULL DEFAULT FALSE,
  `actionUrl` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `readAt` DATETIME(3) NULL,
  `archivedAt` DATETIME(3) NULL,

  INDEX `notifications_userId_idx` (`userId`),
  INDEX `notifications_status_idx` (`status`),
  INDEX `notifications_createdAt_idx` (`createdAt`),
  INDEX `notifications_userId_status_idx` (`userId`, `status`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 15. HISTORICAL KPI DATA TABLE
-- ===================================================================
CREATE TABLE `historical_kpi_data` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(191) NOT NULL,
  `cycleId` VARCHAR(191) NULL,
  `year` INT NOT NULL,
  `quarter` INT NULL,
  `kpis` JSON NOT NULL,
  `totalScore` DOUBLE NOT NULL,
  `performanceRating` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `historical_kpi_data_userId_idx` (`userId`),
  INDEX `historical_kpi_data_year_idx` (`year`),
  INDEX `historical_kpi_data_userId_year_idx` (`userId`, `year`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`cycleId`) REFERENCES `cycles`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 16. AUDIT LOGS TABLE
-- ===================================================================
CREATE TABLE `audit_logs` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `actorId` VARCHAR(191) NOT NULL,
  `actorName` VARCHAR(191) NOT NULL,
  `actorRole` VARCHAR(191) NOT NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `beforeData` JSON NULL,
  `afterData` JSON NULL,
  `ipAddress` VARCHAR(191) NULL,
  `userAgent` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `audit_logs_actorId_idx` (`actorId`),
  INDEX `audit_logs_entityType_idx` (`entityType`),
  INDEX `audit_logs_entityId_idx` (`entityId`),
  INDEX `audit_logs_createdAt_idx` (`createdAt`),
  INDEX `audit_logs_entityType_entityId_idx` (`entityType`, `entityId`),
  FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- MIGRATION COMPLETE
-- ===================================================================