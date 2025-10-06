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
  `analysis_summary` varchar(5000) DEFAULT NULL,
  `advice` varchar(5000) DEFAULT NULL,
  `grade` int DEFAULT NULL,
  `image_url` varchar(1000) DEFAULT NULL,
  `user_id_foreign` int DEFAULT NULL,
  `analysis_type` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`result_id`),
  KEY `user_id_foreign` (`user_id_foreign`),
  CONSTRAINT `analysis_results_ibfk_1` FOREIGN KEY (`user_id_foreign`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
  `category` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`habit_id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `daily_habits`
--

LOCK TABLES `daily_habits` WRITE;
/*!40000 ALTER TABLE `daily_habits` DISABLE KEYS */;
INSERT INTO `daily_habits` VALUES (1,'매일 물 7잔 이상 마시기','물 마시기',10,'routine'),(2,'이펙터 4번 사용','이펙터 사용',10,'routine'),(3,'탈모 에센스로 직접 개선','아침 부스터 사용',5,'routine'),(4,'탈모 에센스로 직접 개선','밤 부스터 사용',5,'routine'),(5,'상열감 감소로 탈모 예방','백회혈/사신총혈 마사지',5,'routine'),(6,'혈액 순환 촉진 및 염증 완화','오메가-3 섭취',5,'nutrient'),(7,'모낭 자극 및 모발 성장 촉진','비타민 D 섭취',5,'nutrient'),(8,'항산화 작용 및 건조함 완화','비타민 E 섭취',5,'nutrient'),(9,'모발 구성 성분 및 성장 촉진','단백질 섭취',5,'nutrient'),(10,'산소 운반 및 모발 건강 유지','철분 섭취',5,'nutrient'),(11,'모발 성장 및 강화 촉진','비오틴 섭취',5,'nutrient'),(12,'모발 성장 및 재생 촉진','아연 섭취',5,'nutrient'),(13,'모공 청결 유지로 탈모 방지','밤에 머리 감기',5,'cleanliness'),(14,'모발 약화 및 냉기 방지','머리 바싹 말리기',5,'cleanliness'),(15,'머리 엉킴 방지 및 노폐물 제거','샴푸 전 머리 빗질',5,'cleanliness'),(16,'두피 영양 공급 및 보습','두피 영양팩하기',5,'cleanliness');
/*!40000 ALTER TABLE `daily_habits` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `seedling_status`
--

LOCK TABLES `seedling_status` WRITE;
/*!40000 ALTER TABLE `seedling_status` DISABLE KEYS */;
INSERT INTO `seedling_status` VALUES (3,'정태의 새싹',90,4);
/*!40000 ALTER TABLE `seedling_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_habit_log`
--

DROP TABLE IF EXISTS `user_habit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_habit_log` (
  `habit_log_id` int NOT NULL AUTO_INCREMENT,
  `habit_id_foreign` int DEFAULT NULL,
  `user_id_foreign` int DEFAULT NULL,
  `completion_date` date DEFAULT NULL,
  PRIMARY KEY (`habit_log_id`),
  KEY `habit_id_foreign` (`habit_id_foreign`),
  KEY `user_id_foreign` (`user_id_foreign`),
  CONSTRAINT `user_habit_log_ibfk_1` FOREIGN KEY (`habit_id_foreign`) REFERENCES `daily_habits` (`habit_id`),
  CONSTRAINT `user_habit_log_ibfk_2` FOREIGN KEY (`user_id_foreign`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_habit_log`
--

LOCK TABLES `user_habit_log` WRITE;
/*!40000 ALTER TABLE `user_habit_log` DISABLE KEYS */;
INSERT INTO `user_habit_log` VALUES (37,2,4,'2025-09-30'),(38,2,4,'2025-09-30'),(39,1,4,'2025-09-30'),(40,1,4,'2025-09-30'),(41,3,4,'2025-09-30'),(42,4,4,'2025-09-30'),(43,5,4,'2025-09-30'),(44,6,4,'2025-09-30'),(45,7,4,'2025-09-30'),(46,8,4,'2025-09-30'),(47,9,4,'2025-09-30'),(48,10,4,'2025-09-30'),(49,11,4,'2025-09-30'),(50,12,4,'2025-09-30'),(51,13,4,'2025-09-30'),(52,14,4,'2025-09-30'),(53,15,4,'2025-09-30'),(54,16,4,'2025-09-30');
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
  `map_like` varchar(2000) DEFAULT NULL,
  `youtube_like` varchar(2000) DEFAULT NULL,
  `hospital_like` varchar(2000) DEFAULT NULL,
  `product_like` varchar(2000) DEFAULT NULL,
  `user_id_foreign` int DEFAULT NULL,
  PRIMARY KEY (`list_id`),
  KEY `user_id_foreign` (`user_id_foreign`),
  CONSTRAINT `user_log_ibfk_1` FOREIGN KEY (`user_id_foreign`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
  `nickname` varchar(100) DEFAULT NULL,
  `createdat` datetime DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (4,'$2a$10$N96lSh/ts7/4Ixiv3WjgTO.3ezNPVtioWcD2jhxVRTL2rDdP0tv4C','ROLE_USER','정태','2025-09-30 01:41:07','jeongtae9324@gmail.com','asdasdasd');
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
  `user_id_foreign` int DEFAULT NULL,
  `family_history` bit(1) DEFAULT NULL,
  `is_loss` bit(1) DEFAULT NULL,
  `stress` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`user_info_id`),
  KEY `user_id_foreign` (`user_id_foreign`),
  CONSTRAINT `users_info_ibfk_1` FOREIGN KEY (`user_id_foreign`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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

-- Dump completed on 2025-09-30 13:18:17
