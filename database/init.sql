CREATE DATABASE IF NOT EXISTS marketplace;
USE marketplace;

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS Disputes;
DROP TABLE IF EXISTS Transactions;
DROP TABLE IF EXISTS Notifications;
DROP TABLE IF EXISTS Reviews;
DROP TABLE IF EXISTS Reports;
DROP TABLE IF EXISTS Messages;
DROP TABLE IF EXISTS Chats;
DROP TABLE IF EXISTS Favorites;
DROP TABLE IF EXISTS ProductImages;
DROP TABLE IF EXISTS Products;
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS Users;

-- Users Table
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    profile_picture VARCHAR(255) NULL,
    rating FLOAT DEFAULT 0.0,
    is_admin BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    address VARCHAR(255) NULL,
    latitude FLOAT NULL,
    longitude FLOAT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categories Table
CREATE TABLE Categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products Table
CREATE TABLE Products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category_id INT NOT NULL,
    item_condition VARCHAR(50) NOT NULL, -- 'New', 'Like New', 'Good', 'Fair'
    price DECIMAL(10, 2) NOT NULL,
    secret_min_price DECIMAL(10, 2) NULL,
    location VARCHAR(150) NOT NULL,
    seller_id INT NOT NULL,
    is_sold BOOLEAN DEFAULT FALSE,
    view_count INT DEFAULT 0,
    contact_email VARCHAR(100) NULL,
    contact_phone VARCHAR(50) NULL,
    latitude FLOAT NULL,
    longitude FLOAT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (seller_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX (seller_id),
    INDEX (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ProductImages Table
CREATE TABLE ProductImages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE,
    INDEX (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Favorites Table
CREATE TABLE Favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_favorite (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE,
    INDEX (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chats Table
CREATE TABLE Chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_chat (buyer_id, seller_id, product_id),
    FOREIGN KEY (buyer_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE,
    INDEX (buyer_id),
    INDEX (seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages Table
CREATE TABLE Messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chat_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image'
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES Chats(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX (chat_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reports Table
CREATE TABLE Reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id INT NOT NULL,
    product_id INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    details TEXT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE,
    INDEX (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reviews Table
CREATE TABLE Reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reviewer_id INT NOT NULL,
    reviewee_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewer_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewee_id) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_review (reviewer_id, reviewee_id),
    INDEX (reviewee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications Table
CREATE TABLE Notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'new_message', 'item_sold', 'offer', 'price_drop'
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transactions Table
CREATE TABLE Transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    product_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'escrow', -- 'escrow', 'released', 'refunded', 'disputed'
    stripe_payment_intent_id VARCHAR(255) NULL,
    shipping_address VARCHAR(255) NULL,
    tracking_number VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE,
    INDEX (buyer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Disputes Table
CREATE TABLE Disputes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    buyer_evidence TEXT NOT NULL,
    buyer_image_url VARCHAR(255) NULL,
    seller_evidence TEXT NULL,
    seller_image_url VARCHAR(255) NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES Transactions(id) ON DELETE CASCADE,
    INDEX (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Seed Data

-- Insert Categories
INSERT INTO Categories (name, slug) VALUES 
('Electronics', 'electronics'),
('Vehicles', 'vehicles'),
('Property', 'property'),
('Fashion', 'fashion'),
('Home & Garden', 'home-garden'),
('Hobbies & Sports', 'hobbies-sports');

-- Insert Users (Password is 'password123' for all seeded users. Hashed using bcrypt)
-- Hashed value: $2b$12$8K2K0tP26R7G2eM.nN.S.uB1zQnBw5oJqX.cQ0uM2eJq5s7/GkLg.
INSERT INTO Users (name, email, password_hash, profile_picture, rating, is_admin, email_verified) VALUES
('System Administrator', 'admin@marketplace.com', '$2b$12$8K2K0tP26R7G2eM.nN.S.uB1zQnBw5oJqX.cQ0uM2eJq5s7/GkLg.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 5.0, TRUE, TRUE),
('Alice Smith', 'alice@marketplace.com', '$2b$12$8K2K0tP26R7G2eM.nN.S.uB1zQnBw5oJqX.cQ0uM2eJq5s7/GkLg.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 4.8, FALSE, TRUE),
('Bob Johnson', 'bob@marketplace.com', '$2b$12$8K2K0tP26R7G2eM.nN.S.uB1zQnBw5oJqX.cQ0uM2eJq5s7/GkLg.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 4.5, FALSE, TRUE),
('Charlie Brown', 'charlie@marketplace.com', '$2b$12$8K2K0tP26R7G2eM.nN.S.uB1zQnBw5oJqX.cQ0uM2eJq5s7/GkLg.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 0.0, FALSE, FALSE);

-- Insert Sample Products
INSERT INTO Products (title, description, category_id, item_condition, price, location, seller_id, is_sold, view_count) VALUES
('iPhone 13 Pro - 128GB - Slate Gray', 'Selling my iPhone 13 Pro. It is in Like New condition with no visible scratches. Battery health is at 88%. Comes with the original box and charging cable. Selling because I upgraded.', 1, 'Like New', 185000.00, 'Karachi, Pakistan', 2, FALSE, 42),
('Toyota Camry 2018 SE', 'Selling my reliable Toyota Camry 2018. Silver color, 65,000 miles, single owner, clean title. Serviced regularly at the dealership. Tires replaced 6 months ago. Excellent gas mileage.', 2, 'Good', 5500000.00, 'Lahore, Pakistan', 3, FALSE, 156),
('Suede Leather Jacket', 'Brown suede leather jacket. Size Medium. Vintage look, very comfortable. Has minor wear on the elbows but otherwise in Fair condition. Selling cheap!', 4, 'Fair', 8500.00, 'Rawalpindi, Pakistan', 2, FALSE, 12),
('Ergonomic Office Chair', 'Brand new ergonomic office chair with lumbar support and adjustable armrests. Bought it for my home office but decided to get a standing desk set instead. Still in packaging.', 5, 'New', 22000.00, 'Islamabad, Pakistan', 3, TRUE, 8);

-- Insert Sample Product Images
INSERT INTO ProductImages (product_id, image_url) VALUES
(1, 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=600'),
(2, 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=600'),
(3, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600'),
(4, 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=600');

-- Insert Sample Favorites
INSERT INTO Favorites (user_id, product_id) VALUES
(3, 1),
(2, 2);

-- Insert Sample Chats
INSERT INTO Chats (buyer_id, seller_id, product_id) VALUES
(3, 2, 1); -- Bob wants to buy Alice's iPhone

-- Insert Sample Messages
INSERT INTO Messages (chat_id, sender_id, content, is_read) VALUES
(1, 3, 'Hi Alice, is the iPhone 13 Pro still available?', TRUE),
(1, 2, 'Yes Bob! It is still available. Would you like to check it out?', TRUE),
(1, 3, 'Great! Can we meet tomorrow evening in SF? Also, is the price slightly negotiable?', FALSE);

-- Insert Sample Reviews
INSERT INTO Reviews (reviewer_id, reviewee_id, rating, comment) VALUES
(3, 2, 5, 'Alice was a great seller. Responsive, polite, and the item was exactly as described.');

-- Insert Sample Notifications
INSERT INTO Notifications (user_id, notification_type, content) VALUES
(2, 'new_message', 'You have a new message from Bob Johnson regarding your listing "iPhone 13 Pro"'),
(3, 'item_sold', 'The item "Ergonomic Office Chair" you viewed has been marked as sold');
