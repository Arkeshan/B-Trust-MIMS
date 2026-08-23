CREATE TABLE USER_ACCOUNT(
    username varchar(50),
    password_hash varchar(255) NOT NULL,
    email varchar(255) NOT NULL UNIQUE,
    type ENUM('customer','staff','admin') NOT NULL,
    status ENUM('active','locked') NOT NULL,
    last_login DATETIME,
    PRIMARY KEY(username)
)