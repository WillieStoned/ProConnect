-- ProConnect Database Schema
-- Run this script to initialize the database

CREATE DATABASE IF NOT EXISTS pro_connect
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pro_connect;

-- ============================================================
-- TABLE: users
-- Stores registered user accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  user_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  headline      VARCHAR(220) DEFAULT NULL,
  bio           TEXT DEFAULT NULL,
  location      VARCHAR(100) DEFAULT NULL,
  avatar_url    VARCHAR(500) DEFAULT NULL,
  resume_url    VARCHAR(500) DEFAULT NULL,
  role          ENUM('user', 'admin') DEFAULT 'user',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: connections
-- Manages professional connection requests between users
-- ============================================================
CREATE TABLE IF NOT EXISTS connections (
  connection_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  requester_id    INT UNSIGNED NOT NULL,
  addressee_id    INT UNSIGNED NOT NULL,
  status          ENUM('pending', 'accepted', 'rejected', 'blocked') DEFAULT 'pending',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_connection (requester_id, addressee_id),
  FOREIGN KEY (requester_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (addressee_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_requester (requester_id),
  INDEX idx_addressee (addressee_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: messages
-- Stores direct messages between connected users
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  message_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sender_id     INT UNSIGNED NOT NULL,
  receiver_id   INT UNSIGNED NOT NULL,
  content       TEXT NOT NULL,
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id)   REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_sender (sender_id),
  INDEX idx_receiver (receiver_id),
  INDEX idx_conversation (sender_id, receiver_id),
  INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: events
-- Stores professional networking events
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  event_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organizer_id  INT UNSIGNED NOT NULL,
  title         VARCHAR(200) NOT NULL,
  description   TEXT DEFAULT NULL,
  location      VARCHAR(255) DEFAULT NULL,
  event_type    ENUM('in-person', 'virtual', 'hybrid') DEFAULT 'in-person',
  start_date    DATETIME NOT NULL,
  end_date      DATETIME NOT NULL,
  max_capacity  INT UNSIGNED DEFAULT NULL,
  is_public     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_organizer (organizer_id),
  INDEX idx_start_date (start_date),
  INDEX idx_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: event_participants
-- Tracks user registrations for events
-- ============================================================
CREATE TABLE IF NOT EXISTS event_participants (
  participant_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id        INT UNSIGNED NOT NULL,
  user_id         INT UNSIGNED NOT NULL,
  status          ENUM('registered', 'attended', 'cancelled') DEFAULT 'registered',
  registered_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_participant (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(user_id)  ON DELETE CASCADE,
  INDEX idx_event (event_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
