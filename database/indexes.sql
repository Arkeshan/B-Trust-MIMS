CREATE INDEX idx_savings_account_no ON SAVINGS_ACCOUNT(account_no);
CREATE INDEX idx_transaction_account_no ON TRANSACTION(account_no);

CREATE INDEX idx_person_id ON PERSON(person_id);
CREATE INDEX idx_customer_person_id ON CUSTOMER(person_id);

CREATE INDEX idx_branch_id ON BRANCH(branch_id);