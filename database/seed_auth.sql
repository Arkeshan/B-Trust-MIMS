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
    ('agent_achira', '$2a$10$31hBXzQB.tCQSWjkThEKeul56WfT9ITyP595f3LXuh1WlIYOHD3JS', 'achira@btrust.lk', 'staff', 'active', NULL),
    ('agent_ark', '$2a$10$31hBXzQB.tCQSWjkThEKeul56WfT9ITyP595f3LXuh1WlIYOHD3JS', 'ark@btrust.lk', 'staff', 'active', NULL),
    ('agent_dinisiru', '$2a$10$31hBXzQB.tCQSWjkThEKeul56WfT9ITyP595f3LXuh1WlIYOHD3JS', 'dinisiru@btrust.lk', 'staff', 'active', NULL),
    ('agent_nethmi', '$2a$10$31hBXzQB.tCQSWjkThEKeul56WfT9ITyP595f3LXuh1WlIYOHD3JS', 'nethmi@btrust.lk', 'staff', 'active', NULL),
    ('agent_vimukthi', '$2a$10$31hBXzQB.tCQSWjkThEKeul56WfT9ITyP595f3LXuh1WlIYOHD3JS', 'vimukthi@btrust.lk', 'staff', 'active', NULL);
    

-- 3. Create 5 Agent Personal Profiles
INSERT INTO PERSON (first_name, last_name, nic, dob, phone_number, address, city) VALUES
    ('Achira', 'Ayumal', '200412345678', '2004-01-15', '0771112222', '1A Temple Rd', 'Batticaloa'),
    ('Ark', 'S', '200422345678', '2004-06-20', '0772223333', '2B Beach Rd', 'Trinco'),
    ('Dinsiru', 'S', '200432345678', '2004-08-30', '0773334444', '3C Lake View', 'Ampara'),
    ('Nethmi', 'Dissanayake', '200442345678', '2004-11-11', '0774445555', '4D Market St', 'Batticaloa'),
    ('Vimukthi', 'Senanayake', '200452345678', '2004-12-05', '0775556666', '5E Hill St', 'Trinco');

-- 4. Map Profiles to Logins and Branches
INSERT INTO STAFF (person_id, username, branch_id, role) VALUES
    (1, 'agent_achira', 1, 'agent'),
    (2, 'agent_ark', 2, 'agent'),
    (3, 'agent_dinisiru', 3, 'agent'),
    (4, 'agent_nethmi', 1, 'agent'),
    (5, 'agent_vimukthi', 2, 'agent');
