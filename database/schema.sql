CREATE TABLE USER_ACCOUNT(
    username varchar(50),
    password_hash varchar(255) NOT NULL,
    email varchar(255) NOT NULL UNIQUE,
    type ENUM('customer','staff','admin') NOT NULL,
    status ENUM('active','locked') NOT NULL,
    last_login DATETIME,
    PRIMARY KEY(username)
);
Create Table Branch(
    branch_id   int auto_increment PRIMARY KEY,
    branch_name varchar(100) not null,
    address     varchar(255) not null,
    phone_number varchar(20) not null

    

)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE PERSON (
    person_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    nic VARCHAR(20), 
    dob DATE NOT NULL,
    phone_number VARCHAR(15),
    address VARCHAR(255),
    city VARCHAR(100)
);


CREATE TABLE account_plan (
    plan_id INT AUTO_INCREMENT PRIMARY KEY,
    plan_name VARCHAR(30) NOT NULL UNIQUE,
    interest_rate DECIMAL(5,2) NOT NULL,
    min_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT chk_account_plan_interest
        CHECK (interest_rate >= 0 AND interest_rate <= 100),

    CONSTRAINT chk_account_plan_min_balance
        CHECK (min_balance >= 0)
);

INSERT INTO account_plan
    (plan_name, interest_rate, min_balance)
VALUES
    ('Children', 12.00, 0.00),
    ('Teen', 11.00, 500.00),
    ('Adult', 10.00, 1000.00),
    ('Senior', 13.00, 1000.00),
    ('Joint', 7.00, 5000.00);

CREATE TABLE FD_PLAN (
    fd_plan_id      INT AUTO_INCREMENT PRIMARY KEY,
    interest_rate   DECIMAL(5,2) NOT NULL,
    term_months     INT NOT NULL,

    CONSTRAINT chk_term_months CHECK (term_months IN (6, 12, 36)),
    CONSTRAINT chk_interest_rate CHECK (interest_rate > 0),
    CONSTRAINT uq_term_months UNIQUE (term_months)
);

INSERT INTO FD_PLAN (interest_rate, term_months) VALUES
(13.00, 6),
(14.00, 12),
(15.00, 36);
