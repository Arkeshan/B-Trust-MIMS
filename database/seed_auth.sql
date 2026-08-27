-- ==========================================
-- SEED DATA: BRANCHES & AGENTS (AUTH)
-- ==========================================

-- 1. Create 3 Service Branches
INSERT INTO BRANCH (branch_name, address, phone_number) VALUES
    ('Batticaloa HQ', '45 Main Street', '0652223344'),
    ('Trinco Branch', '12 Beach Road', '0262223344'),
    ('Ampara Hub', '88 Central Way', '0632223344');

-- 2. Create 5 Agent Login Accounts
INSERT INTO USER_ACCOUNT (username, password_hash, email, type, status, last_login) VALUES
    ('agent_achira', 'hash123', 'achira@btrust.lk', 'staff', 'active', NULL),
    ('agent_ark', 'hash123', 'ark@btrust.lk', 'staff', 'active', NULL),
    ('agent_dinisiru', 'hash123', 'dinisiru@btrust.lk', 'staff', 'active', NULL),
    ('agent_nethmi', 'hash123', 'nethmi@btrust.lk', 'staff', 'active', NULL),
    ('agent_vimukthi', 'hash123', 'vimukthi@btrust.lk', 'staff', 'active', NULL);

-- 3. Create 5 Agent Personal Profiles
INSERT INTO PERSON (first_name, last_name, nic, dob, phone_number, address, city) VALUES
    ('Achira', 'Perera', '199512345678', '1995-01-15', '0771112222', '1A Temple Rd', 'Batticaloa'),
    ('Ark', 'Silva', '199612345678', '1996-06-20', '0772223333', '2B Beach Rd', 'Trinco'),
    ('Dinisiru', 'Fernando', '199712345678', '1997-08-30', '0773334444', '3C Lake View', 'Ampara'),
    ('Nethmi', 'Kumari', '199812345678', '1998-11-11', '0774445555', '4D Market St', 'Batticaloa'),
    ('Vimukthi', 'Rajapaksha', '199912345678', '1999-12-05', '0775556666', '5E Hill St', 'Trinco');

-- 4. Map Profiles to Logins and Branches
INSERT INTO STAFF (person_id, username, branch_id, role) VALUES
    (1, 'agent_achira', 1, 'agent'),
    (2, 'agent_ark', 2, 'agent'),
    (3, 'agent_dinisiru', 3, 'agent'),
    (4, 'agent_nethmi', 1, 'agent'),
    (5, 'agent_vimukthi', 2, 'agent');