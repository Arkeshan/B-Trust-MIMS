CREATE TABLE USER_ACCOUNT(
    username VARCHAR(50) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    type ENUM('customer', 'staff', 'admin') NOT NULL, -- CUSTOMER = CUSTOMER, STAFF = AGENT, ADMIN = BANK
    status ENUM('active', 'locked') NOT NULL,
    last_login DATETIME
);

CREATE TABLE PERSON(
    person_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    nic VARCHAR(12) UNIQUE, 
    dob DATE NOT NULL,
    phone_number VARCHAR(10) CHECK (phone_number REGEXP '^[0-9]{10}$'),
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL
);

CREATE TABLE BRANCH(
    branch_id INT AUTO_INCREMENT PRIMARY KEY,
    branch_name VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL
);

CREATE TABLE ACCOUNT_PLAN(
    plan_id INT AUTO_INCREMENT PRIMARY KEY,
    plan_name VARCHAR(30) NOT NULL UNIQUE,
    interest_rate DECIMAL(5,2) NOT NULL,
    min_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT chk_account_plan_interest CHECK (interest_rate >= 0 AND interest_rate < 100),
    CONSTRAINT chk_account_plan_min_balance CHECK (min_balance >= 0)
);

CREATE TABLE FD_PLAN(
    fd_plan_id INT AUTO_INCREMENT PRIMARY KEY,
    interest_rate DECIMAL(5,2) NOT NULL,
    term_months INT NOT NULL,
    CONSTRAINT chk_term_months CHECK (term_months IN (6, 12, 36)),
    CONSTRAINT chk_interest_rate CHECK (interest_rate > 0 AND interest_rate < 100),
    CONSTRAINT uq_term_months UNIQUE (term_months)
);

CREATE TABLE STAFF(
    person_id INT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    branch_id INT NOT NULL,
    role ENUM('agent') NOT NULL DEFAULT 'agent',
    FOREIGN KEY (person_id) REFERENCES PERSON(person_id),
    FOREIGN KEY (username) REFERENCES USER_ACCOUNT(username),
    FOREIGN KEY (branch_id) REFERENCES BRANCH(branch_id)
);

CREATE TABLE CUSTOMER(
    person_id INT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    assigned_agent_person_id INT,
    guardian_person_id INT,
    registered_branch_id INT NOT NULL,
    FOREIGN KEY (person_id) REFERENCES PERSON(person_id),
    FOREIGN KEY (username) REFERENCES USER_ACCOUNT(username),
    FOREIGN KEY (assigned_agent_person_id) REFERENCES STAFF(person_id),
    FOREIGN KEY (guardian_person_id) REFERENCES PERSON(person_id),
    FOREIGN KEY (registered_branch_id) REFERENCES BRANCH(branch_id)
);

CREATE TABLE SAVINGS_ACCOUNT(
    account_no VARCHAR(12) PRIMARY KEY,
    plan_id INT NOT NULL,
    branch_id INT NOT NULL,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    opened_date DATE NOT NULL,
    status ENUM('active', 'dormant', 'closed') NOT NULL DEFAULT 'active',
    FOREIGN KEY (plan_id) REFERENCES ACCOUNT_PLAN(plan_id),
    FOREIGN KEY (branch_id) REFERENCES BRANCH(branch_id)
);

CREATE TABLE OTP_TOKEN(
    token_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    purpose ENUM('login', 'transaction', 'reset') NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (username) REFERENCES USER_ACCOUNT(username)
);

CREATE TABLE USER_SESSION(
    session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    device_ip VARCHAR(50),
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES USER_ACCOUNT(username)
);

CREATE TABLE NOTIFICATION(
    notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES USER_ACCOUNT(username)
);

CREATE TABLE ACCOUNT_HOLDER(
    person_id INT NOT NULL,
    account_no VARCHAR(12) NOT NULL,
    PRIMARY KEY (person_id, account_no),
    FOREIGN KEY (person_id) REFERENCES PERSON(person_id),
    FOREIGN KEY (account_no) REFERENCES SAVINGS_ACCOUNT(account_no)
);

CREATE TABLE FIXED_DEPOSIT(
    fd_acc_no VARCHAR(12) PRIMARY KEY,
    account_no VARCHAR(12) NOT NULL,
    fd_plan_id INT NOT NULL,
    investment DECIMAL(15,2) NOT NULL,
    start_date DATE NOT NULL,
    interest_paid_to_date DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    next_payout_date DATE NOT NULL,
    FOREIGN KEY (account_no) REFERENCES SAVINGS_ACCOUNT(account_no),
    FOREIGN KEY (fd_plan_id) REFERENCES FD_PLAN(fd_plan_id)
);

CREATE TABLE TRANSACTION(
    txn_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_no VARCHAR(12) NOT NULL,
    staff_person_id INT,
    txn_type ENUM('deposit', 'withdrawal', 'interest') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference_no VARCHAR(100),
    remarks VARCHAR(255),
    FOREIGN KEY (account_no) REFERENCES SAVINGS_ACCOUNT(account_no),
    FOREIGN KEY (staff_person_id) REFERENCES STAFF(person_id)
);

INSERT INTO ACCOUNT_PLAN(plan_name, interest_rate, min_balance) VALUES
    ('Children', 12.00, 0.00),
    ('Teen', 11.00, 500.00),
    ('Adult', 10.00, 1000.00),
    ('Senior', 13.00, 1000.00),
    ('Joint', 7.00, 5000.00);

INSERT INTO FD_PLAN(interest_rate, term_months) VALUES
    (13.00, 6),
    (14.00, 12),
    (15.00, 36);
