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