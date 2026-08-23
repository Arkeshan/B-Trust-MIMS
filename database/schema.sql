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
    phone_number varchar(20) not null,

    

)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE PERSON (
    person_id INT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    nic VARCHAR(20), 
    dob DATE NOT NULL,
    phone_number VARCHAR(15),
    address VARCHAR(255),
    city VARCHAR(100)
);
