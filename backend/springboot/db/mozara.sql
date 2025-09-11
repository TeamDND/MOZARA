CREATE DATABASE  IF NOT EXISTS `mozara` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `mozara`;
-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: localhost    Database: mozara
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `analysis_results`
--

DROP TABLE IF EXISTS `analysis_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `analysis_results` (
  `result_id` int NOT NULL AUTO_INCREMENT,
  `inspection_date` date DEFAULT NULL,
  `analysis_summary` tinytext,
  `advice` tinytext,
  `grade` int DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `user_id_foreign` int DEFAULT NULL,
  PRIMARY KEY (`result_id`),
  KEY `user_id_foreign` (`user_id_foreign`),
  CONSTRAINT `analysis_results_ibfk_1` FOREIGN KEY (`user_id_foreign`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `analysis_results`
--

LOCK TABLES `analysis_results` WRITE;
/*!40000 ALTER TABLE `analysis_results` DISABLE KEYS */;
/*!40000 ALTER TABLE `analysis_results` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `daily_habits`
--

DROP TABLE IF EXISTS `daily_habits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_habits` (
  `habit_id` int NOT NULL AUTO_INCREMENT,
  `description` tinytext,
  `habit_name` varchar(255) DEFAULT NULL,
  `reward_points` int DEFAULT NULL,
  PRIMARY KEY (`habit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `daily_habits`
--

LOCK TABLES `daily_habits` WRITE;
/*!40000 ALTER TABLE `daily_habits` DISABLE KEYS */;
/*!40000 ALTER TABLE `daily_habits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `measurement_logs`
--

DROP TABLE IF EXISTS `measurement_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `measurement_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(255) DEFAULT NULL,
  `value` varchar(255) DEFAULT NULL,
  `record_date` datetime DEFAULT NULL,
  `user_id_foreign` int DEFAULT NULL,
  PRIMARY KEY (`log_id`),
  KEY `user_id_foreign` (`user_id_foreign`),
  CONSTRAINT `measurement_logs_ibfk_1` FOREIGN KEY (`user_id_foreign`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `measurement_logs`
--

LOCK TABLES `measurement_logs` WRITE;
/*!40000 ALTER TABLE `measurement_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `measurement_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `seedling_status`
--

DROP TABLE IF EXISTS `seedling_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `seedling_status` (
  `seedling_id` int NOT NULL AUTO_INCREMENT,
  `seedling_name` varchar(50) DEFAULT NULL,
  `current_point` int DEFAULT NULL,
  `user_id_foreign` int DEFAULT NULL,
  PRIMARY KEY (`seedling_id`),
  KEY `user_id_foreign` (`user_id_foreign`),
  CONSTRAINT `seedling_status_ibfk_1` FOREIGN KEY (`user_id_foreign`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `seedling_status`
--

LOCK TABLES `seedling_status` WRITE;
/*!40000 ALTER TABLE `seedling_status` DISABLE KEYS */;
/*!40000 ALTER TABLE `seedling_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_habit_log`
--

DROP TABLE IF EXISTS `user_habit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_habit_log` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `habit_id_foreign` int DEFAULT NULL,
  `user_id_foreign` int DEFAULT NULL,
  `completion_date` date DEFAULT NULL,
  PRIMARY KEY (`log_id`),
  KEY `habit_id_foreign` (`habit_id_foreign`),
  KEY `user_id_foreign` (`user_id_foreign`),
  CONSTRAINT `user_habit_log_ibfk_1` FOREIGN KEY (`habit_id_foreign`) REFERENCES `daily_habits` (`habit_id`),
  CONSTRAINT `user_habit_log_ibfk_2` FOREIGN KEY (`user_id_foreign`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_habit_log`
--

LOCK TABLES `user_habit_log` WRITE;
/*!40000 ALTER TABLE `user_habit_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_habit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_log`
--

DROP TABLE IF EXISTS `user_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_log` (
  `list_id` int NOT NULL AUTO_INCREMENT,
  `map_like` varchar(255) DEFAULT NULL,
  `youtube_like` varchar(255) DEFAULT NULL,
  `hospital_like` varchar(255) DEFAULT NULL,
  `user_id_foreign` int DEFAULT NULL,
  PRIMARY KEY (`list_id`),
  KEY `user_id_foreign` (`user_id_foreign`),
  CONSTRAINT `user_log_ibfk_1` FOREIGN KEY (`user_id_foreign`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_log`
--

LOCK TABLES `user_log` WRITE;
/*!40000 ALTER TABLE `user_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `password` varchar(255) DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `createdat` datetime DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `address` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_info`
--

DROP TABLE IF EXISTS `users_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_info` (
  `user_info_id` int NOT NULL AUTO_INCREMENT,
  `gender` varchar(50) DEFAULT NULL,
  `age` int DEFAULT NULL,
  `nickname` varchar(100) DEFAULT NULL,
  `user_id_foreign` int DEFAULT NULL,
  PRIMARY KEY (`user_info_id`),
  KEY `user_id_foreign` (`user_id_foreign`),
  CONSTRAINT `users_info_ibfk_1` FOREIGN KEY (`user_id_foreign`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_info`
--

LOCK TABLES `users_info` WRITE;
/*!40000 ALTER TABLE `users_info` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_info` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-10 16:29:37
