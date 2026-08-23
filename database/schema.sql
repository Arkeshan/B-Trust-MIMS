Create Table Branch(
    branch_id   int auto_increment PRIMARY KEY,
    branch_name varchar(100) not null,
    address     varchar(255) not null,
    phone_number varchar(20) not null,

    

)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;