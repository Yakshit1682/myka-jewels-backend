DROP DATABASE IF EXISTS myka_jewels;

CREATE DATABASE myka_jewels CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE myka_jewels;

SET
    FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS product_inquiries;

DROP TABLE IF EXISTS wishlist_items;

DROP TABLE IF EXISTS product_images;

DROP TABLE IF EXISTS product_categories;

DROP TABLE IF EXISTS products;

DROP TABLE IF EXISTS categories;

DROP TABLE IF EXISTS contact_form_submissions;

DROP TABLE IF EXISTS user_sessions;

DROP TABLE IF EXISTS user_roles;

DROP TABLE IF EXISTS roles;

DROP TABLE IF EXISTS users;

SET
    FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NULL,
    email VARCHAR(190) NOT NULL,
    phone VARCHAR(30) NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    email_verified_at DATETIME NULL,
    phone_verified_at DATETIME NULL,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_uuid (uuid),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_phone (phone),
    KEY idx_users_active (is_active)
) ENGINE = InnoDB;

CREATE TABLE roles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_name (name)
) ENGINE = InnoDB;

CREATE TABLE user_roles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_roles_user_role (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE user_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) NULL,
    device_name VARCHAR(120) NULL,
    ip_address VARCHAR(64) NULL,
    user_agent TEXT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_sessions_uuid (uuid),
    KEY idx_user_sessions_user (user_id),
    KEY idx_user_sessions_token_hash (token_hash),
    KEY idx_user_sessions_expires (expires_at),
    CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE contact_form_submissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NULL,
    email VARCHAR(190) NOT NULL,
    phone VARCHAR(30) NULL,
    subject VARCHAR(150) NULL,
    message TEXT NOT NULL,
    status ENUM('NEW', 'READ', 'REPLIED', 'CLOSED') NOT NULL DEFAULT 'NEW',
    admin_notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_contact_uuid (uuid),
    KEY idx_contact_user (user_id),
    KEY idx_contact_status (status),
    KEY idx_contact_created (created_at),
    CONSTRAINT fk_contact_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE
    SET
        NULL ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    parent_id BIGINT UNSIGNED NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    description TEXT NULL,
    image_data_uri MEDIUMTEXT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_categories_uuid (uuid),
    UNIQUE KEY uq_categories_slug (slug),
    KEY idx_categories_parent (parent_id),
    KEY idx_categories_active (is_active),
    KEY idx_categories_sort (sort_order),
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE
    SET
        NULL ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE products (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(220) NOT NULL,
    sku VARCHAR(100) NULL,
    short_description VARCHAR(500) NULL,
    description TEXT NULL,
    material VARCHAR(150) NULL,
    metal_color VARCHAR(100) NULL,
    price DECIMAL(12, 2) NULL,
    compare_at_price DECIMAL(12, 2) NULL,
    weight_grams DECIMAL(10, 3) NULL,
    stock_status ENUM('IN_STOCK', 'OUT_OF_STOCK', 'ON_REQUEST') NOT NULL DEFAULT 'IN_STOCK',
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_products_uuid (uuid),
    UNIQUE KEY uq_products_slug (slug),
    UNIQUE KEY uq_products_sku (sku),
    KEY idx_products_active (is_active),
    KEY idx_products_featured (is_featured),
    KEY idx_products_stock (stock_status),
    KEY idx_products_created (created_at),
    CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE
    SET
        NULL ON UPDATE CASCADE,
        CONSTRAINT fk_products_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE
    SET
        NULL ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE product_categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_product_categories (product_id, category_id),
    KEY idx_product_categories_category (category_id),
    CONSTRAINT fk_product_categories_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_product_categories_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE product_images (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    data_uri MEDIUMTEXT NOT NULL,
    alt_text VARCHAR(255) NULL,
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 1,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_product_images_uuid (uuid),
    UNIQUE KEY uq_product_images_product_sort (product_id, sort_order),
    KEY idx_product_images_product (product_id),
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_product_images_sort_order CHECK (
        sort_order BETWEEN 1
        AND 4
    )
) ENGINE = InnoDB;

CREATE TABLE wishlist_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_wishlist_user_product (user_id, product_id),
    KEY idx_wishlist_product (product_id),
    CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_wishlist_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE product_inquiries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    customer_email VARCHAR(190) NULL,
    customer_phone VARCHAR(30) NULL,
    inquiry_message TEXT NOT NULL,
    shop_whatsapp_number VARCHAR(30) NOT NULL,
    whatsapp_url TEXT NULL,
    status ENUM('CLICKED', 'CONTACTED', 'CLOSED') NOT NULL DEFAULT 'CLICKED',
    clicked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    contacted_at DATETIME NULL,
    closed_at DATETIME NULL,
    admin_notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_product_inquiries_uuid (uuid),
    KEY idx_product_inquiries_user (user_id),
    KEY idx_product_inquiries_product (product_id),
    KEY idx_product_inquiries_status (status),
    KEY idx_product_inquiries_clicked (clicked_at),
    CONSTRAINT fk_product_inquiries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_product_inquiries_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

-- Maximum 4 images per product is enforced in the Node.js backend.
-- A database trigger is intentionally not used here for broad MySQL compatibility.
INSERT INTO
    roles (name, description)
VALUES
    (
        'ADMIN',
        'Administrator with full management access'
    ),
    ('USER', 'Regular customer account');

INSERT INTO
    categories (
        uuid,
        parent_id,
        name,
        slug,
        sort_order,
        is_active
    )
VALUES
    (
        UUID(),
        NULL,
        'New Arrivals',
        'new-arrivals',
        1,
        1
    ),
    (UUID(), NULL, 'Earrings', 'earrings', 2, 1),
    (UUID(), NULL, 'Necklaces', 'necklaces', 3, 1),
    (UUID(), NULL, 'Bracelets', 'bracelets', 4, 1),
    (UUID(), NULL, 'Rings', 'rings', 5, 1),
    (
        UUID(),
        NULL,
        'Jewellery Sets',
        'jewellery-sets',
        6,
        1
    ),
    (
        UUID(),
        NULL,
        'Traditional Jewellery',
        'traditional-jewellery',
        7,
        1
    ),
    (
        UUID(),
        NULL,
        'Fashion Jewellery',
        'fashion-jewellery',
        8,
        1
    ),
    (
        UUID(),
        NULL,
        'Anti-Tarnish Jewellery',
        'anti-tarnish-jewellery',
        9,
        1
    ),
    (
        UUID(),
        NULL,
        'Best Sellers',
        'best-sellers',
        10,
        1
    );

SET
    @earrings_id = (
        SELECT
            id
        FROM
            categories
        WHERE
            slug = 'earrings'
        LIMIT
            1
    );

SET
    @necklaces_id = (
        SELECT
            id
        FROM
            categories
        WHERE
            slug = 'necklaces'
        LIMIT
            1
    );

INSERT INTO
    categories (
        uuid,
        parent_id,
        name,
        slug,
        sort_order,
        is_active
    )
VALUES
    (UUID(), @earrings_id, 'Studs', 'studs', 1, 1),
    (UUID(), @earrings_id, 'Hoops', 'hoops', 2, 1),
    (UUID(), @earrings_id, 'Jhumkas', 'jhumkas', 3, 1),
    (
        UUID(),
        @earrings_id,
        'Meenakari',
        'meenakari',
        4,
        1
    ),
    (
        UUID(),
        @necklaces_id,
        'Necklaces',
        'necklaces-main',
        1,
        1
    ),
    (
        UUID(),
        @necklaces_id,
        'Pendant Sets',
        'pendant-sets',
        2,
        1
    );

CREATE TABLE password_reset_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_password_reset_user_id (user_id),
    INDEX idx_password_reset_expires_at (expires_at)
);