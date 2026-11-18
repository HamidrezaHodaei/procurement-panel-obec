
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `agents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `process_id` int(11) NOT NULL,
  `entity` varchar(50) NOT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `action` enum('create','update','delete') NOT NULL,
  `summary` varchar(500) NOT NULL,
  `changes` mediumtext DEFAULT NULL,
  `user_name` varchar(255) NOT NULL,
  `at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_process` (`process_id`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `brands` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `kind` enum('domestic','foreign') NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_brand` (`name`,`kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cheques` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `process_id` int(11) NOT NULL,
  `cheque_number` varchar(100) NOT NULL,
  `cheque_date` date NOT NULL,
  `amount` bigint(20) NOT NULL,
  `currency_id` int(11) NOT NULL,
  `issuer_name` varchar(255) NOT NULL DEFAULT '',
  `status` enum('pending','cashed','bounced') NOT NULL DEFAULT 'pending',
  `notes` text NOT NULL,
  `created_by` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cheques_process` (`process_id`),
  KEY `currency_id` (`currency_id`),
  CONSTRAINT `cheques_ibfk_1` FOREIGN KEY (`process_id`) REFERENCES `purchase_processes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cheques_ibfk_2` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `CONSTRAINT_1` CHECK (`amount` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `currencies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(10) NOT NULL,
  `name` varchar(100) NOT NULL,
  `symbol` varchar(20) NOT NULL DEFAULT '',
  `decimals` tinyint(4) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  CONSTRAINT `CONSTRAINT_1` CHECK (`decimals` between 0 and 4)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `executors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `guarantee_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `issued_guarantees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `process_id` int(11) NOT NULL,
  `guarantee_type_id` int(11) NOT NULL,
  `reference_no` varchar(255) NOT NULL,
  `amount` bigint(20) NOT NULL,
  `currency_id` int(11) NOT NULL,
  `issue_date` date NOT NULL,
  `valid_until` date DEFAULT NULL,
  `recipient_name` varchar(255) NOT NULL,
  `related_company_id` int(11) DEFAULT NULL,
  `status` enum('active','returned','collected','cancelled') NOT NULL DEFAULT 'active',
  `notes` text NOT NULL,
  `created_by` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ig_process` (`process_id`),
  KEY `guarantee_type_id` (`guarantee_type_id`),
  KEY `currency_id` (`currency_id`),
  KEY `related_company_id` (`related_company_id`),
  CONSTRAINT `issued_guarantees_ibfk_1` FOREIGN KEY (`process_id`) REFERENCES `purchase_processes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `issued_guarantees_ibfk_2` FOREIGN KEY (`guarantee_type_id`) REFERENCES `guarantee_types` (`id`),
  CONSTRAINT `issued_guarantees_ibfk_3` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `issued_guarantees_ibfk_4` FOREIGN KEY (`related_company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `CONSTRAINT_1` CHECK (`amount` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `category_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_item` (`name`,`category_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `items_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `item_categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_methods` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `kind` enum('cheque','cash','guarantee','other') NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_stages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `process_id` int(11) NOT NULL,
  `seq` int(11) NOT NULL DEFAULT 1,
  `amount_type` enum('amount','percent') NOT NULL,
  `amount` bigint(20) DEFAULT NULL,
  `currency_id` int(11) DEFAULT NULL,
  `percent_bp` int(11) DEFAULT NULL,
  `condition_text` varchar(500) NOT NULL DEFAULT '',
  `due_date` date DEFAULT NULL,
  `status` enum('paid','unpaid') NOT NULL DEFAULT 'unpaid',
  `paid_at` date DEFAULT NULL,
  `notes` text NOT NULL,
  `created_by` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_stages_process` (`process_id`),
  KEY `currency_id` (`currency_id`),
  CONSTRAINT `payment_stages_ibfk_1` FOREIGN KEY (`process_id`) REFERENCES `purchase_processes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_stages_ibfk_2` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `CONSTRAINT_1` CHECK (`amount_type` = 'amount' and `amount` is not null and `currency_id` is not null or `amount_type` = 'percent' and `percent_bp` is not null)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `process_payment_methods` (
  `process_id` int(11) NOT NULL,
  `payment_method_id` int(11) NOT NULL,
  PRIMARY KEY (`process_id`,`payment_method_id`),
  KEY `payment_method_id` (`payment_method_id`),
  CONSTRAINT `process_payment_methods_ibfk_1` FOREIGN KEY (`process_id`) REFERENCES `purchase_processes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `process_payment_methods_ibfk_2` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_processes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `request_number` varchar(100) NOT NULL,
  `company_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `status` enum('active','completed','cancelled') NOT NULL DEFAULT 'active',
  `completed_at` date DEFAULT NULL,
  `agent_id` int(11) DEFAULT NULL,
  `agent_relation` enum('direct','indirect') DEFAULT NULL,
  `executor_id` int(11) DEFAULT NULL,
  `purchase_type` enum('domestic','foreign') NOT NULL,
  `brand_id` int(11) DEFAULT NULL,
  `actions_text` mediumtext NOT NULL,
  `tender_winner` varchar(255) NOT NULL DEFAULT '',
  `purchase_amount` bigint(20) DEFAULT NULL,
  `purchase_currency_id` int(11) DEFAULT NULL,
  `proforma_date` date DEFAULT NULL,
  `proforma_amount` bigint(20) DEFAULT NULL,
  `proforma_currency_id` int(11) DEFAULT NULL,
  `created_by` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_number` (`request_number`),
  KEY `idx_pp_company` (`company_id`),
  KEY `idx_pp_item` (`item_id`),
  KEY `idx_pp_start` (`start_date`),
  KEY `agent_id` (`agent_id`),
  KEY `executor_id` (`executor_id`),
  KEY `brand_id` (`brand_id`),
  KEY `purchase_currency_id` (`purchase_currency_id`),
  KEY `proforma_currency_id` (`proforma_currency_id`),
  CONSTRAINT `purchase_processes_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `purchase_processes_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `purchase_processes_ibfk_3` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`),
  CONSTRAINT `purchase_processes_ibfk_4` FOREIGN KEY (`executor_id`) REFERENCES `executors` (`id`),
  CONSTRAINT `purchase_processes_ibfk_5` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`),
  CONSTRAINT `purchase_processes_ibfk_6` FOREIGN KEY (`purchase_currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `purchase_processes_ibfk_7` FOREIGN KEY (`proforma_currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `CONSTRAINT_1` CHECK (`purchase_amount` is null = (`purchase_currency_id` is null)),
  CONSTRAINT `CONSTRAINT_2` CHECK (`proforma_amount` is null = (`proforma_currency_id` is null))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `received_guarantees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `process_id` int(11) NOT NULL,
  `guarantee_type_id` int(11) NOT NULL,
  `reference_no` varchar(255) NOT NULL,
  `amount` bigint(20) NOT NULL,
  `currency_id` int(11) NOT NULL,
  `issue_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `status` enum('active','returned','collected','cancelled') NOT NULL DEFAULT 'active',
  `notes` text NOT NULL,
  `created_by` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rg_process` (`process_id`),
  KEY `guarantee_type_id` (`guarantee_type_id`),
  KEY `currency_id` (`currency_id`),
  CONSTRAINT `received_guarantees_ibfk_1` FOREIGN KEY (`process_id`) REFERENCES `purchase_processes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `received_guarantees_ibfk_2` FOREIGN KEY (`guarantee_type_id`) REFERENCES `guarantee_types` (`id`),
  CONSTRAINT `received_guarantees_ibfk_3` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `CONSTRAINT_1` CHECK (`amount` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `schema_version` (
  `v` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','editor','viewer') NOT NULL DEFAULT 'editor',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `last_login` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_payment_stages` AS SELECT
 1 AS `id`,
  1 AS `process_id`,
  1 AS `seq`,
  1 AS `amount_type`,
  1 AS `amount`,
  1 AS `currency_id`,
  1 AS `percent_bp`,
  1 AS `condition_text`,
  1 AS `due_date`,
  1 AS `status`,
  1 AS `paid_at`,
  1 AS `notes`,
  1 AS `created_by`,
  1 AS `created_at`,
  1 AS `updated_by`,
  1 AS `updated_at`,
  1 AS `eff_currency_id`,
  1 AS `eff_amount`,
  1 AS `eff_status` */;
SET character_set_client = @saved_cs_client;
/*!50001 DROP VIEW IF EXISTS `v_payment_stages`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`proc`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_payment_stages` AS select `s`.`id` AS `id`,`s`.`process_id` AS `process_id`,`s`.`seq` AS `seq`,`s`.`amount_type` AS `amount_type`,`s`.`amount` AS `amount`,`s`.`currency_id` AS `currency_id`,`s`.`percent_bp` AS `percent_bp`,`s`.`condition_text` AS `condition_text`,`s`.`due_date` AS `due_date`,`s`.`status` AS `status`,`s`.`paid_at` AS `paid_at`,`s`.`notes` AS `notes`,`s`.`created_by` AS `created_by`,`s`.`created_at` AS `created_at`,`s`.`updated_by` AS `updated_by`,`s`.`updated_at` AS `updated_at`,case when `s`.`amount_type` = 'percent' then coalesce(`p`.`proforma_currency_id`,`p`.`purchase_currency_id`) else `s`.`currency_id` end AS `eff_currency_id`,case when `s`.`amount_type` = 'percent' then cast(round(coalesce(`p`.`proforma_amount`,`p`.`purchase_amount`,0) * `s`.`percent_bp` / 10000,0) as signed) else `s`.`amount` end AS `eff_amount`,case when `s`.`status` = 'paid' then 'paid' when `s`.`due_date` is not null and `s`.`due_date` < curdate() then 'overdue' else 'unpaid' end AS `eff_status` from (`payment_stages` `s` join `purchase_processes` `p` on(`p`.`id` = `s`.`process_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

