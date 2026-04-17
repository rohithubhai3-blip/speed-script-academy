// =======================
// FIREBASE REST API CONFIG
// =======================
// 🔥 ACTION REQUIRED: Paste your free Firebase Realtime Database URL here:
const FIREBASE_DB_URL = "https://your-firebase-project-id.firebaseio.com";

// Helper to check if Firebase is configured
function isFirebaseConfigured() {
    return FIREBASE_DB_URL !== "https://your-firebase-project-id.firebaseio.com" && FIREBASE_DB_URL !== "";
}

// Fallback functions for LocalStorage (if Firebase isn't set up yet)
function getLocalUsers() {
    return JSON.parse(localStorage.getItem("users")) || [];
}
function saveLocalUsers(users) {
    localStorage.setItem("users", JSON.stringify(users));
}
if (!localStorage.getItem("users")) saveLocalUsers([]);

// =======================
// REGISTER FUNCTION
// =======================
async function register() {
    let firstnameEl = document.getElementById("firstname");
    let lastnameEl = document.getElementById("lastname");
    let firstname = firstnameEl ? firstnameEl.value.trim() : "";
    let lastname = lastnameEl ? lastnameEl.value.trim() : "";
    let user = document.getElementById("username").value.trim();
    let pass = document.getElementById("password").value.trim();
    
    if(!user || !pass) {
        alert("Please enter both username and password!");
        return;
    }
    if(user.toLowerCase() === "admin") {
        alert("Cannot register as admin. Use a different username.");
        return;
    }

    // Changing button text to show loading in UI
    let btn = document.querySelector(".btn-submit");
    if(btn) btn.innerText = "Creating...";

    let newUser = {
        firstname: firstname,
        lastname: lastname,
        username: user,
        password: pass, 
        registerDate: new Date().toLocaleString()
    };

    if (isFirebaseConfigured()) {
        try {
            // Check if username already exists in Firebase Database
            let response = await fetch(`${FIREBASE_DB_URL}/users/${user}.json`);
            let existingUser = await response.json();
            
            if (existingUser) {
                alert("Username already exists! Please choose another one.");
                if(btn) btn.innerText = "Create Account";
                return;
            }
            
            // Save new user to Firebase
            await fetch(`${FIREBASE_DB_URL}/users/${user}.json`, {
                method: "PUT",
                body: JSON.stringify(newUser),
                headers: { "Content-Type": "application/json" }
            });
            alert("Account created successfully! Please login.");
            window.location.href = "login.html";
        } catch (error) {
            alert("Database Error! " + error.message);
            if(btn) btn.innerText = "Create Account";
        }
    } else {
        // Fallback to localStorage
        let users = getLocalUsers();
        if(users.find(u => u.username === user)) {
            alert("Username already exists! (Local Backup)");
            if(btn) btn.innerText = "Create Account";
            return;
        }
        users.push(newUser);
        saveLocalUsers(users);
        alert("Account created successfully! (Saved Locally - Add Firebase URL to save online)");
        window.location.href = "login.html";
    }
}

// =======================
// LOGIN FUNCTION
// =======================
async function login(){
    let user = document.getElementById("username").value.trim();
    let pass = document.getElementById("password").value.trim();

    if(!user || !pass){
        alert("Please enter both username and password!");
        return;
    }

    if(user === "admin" && pass === "admin123"){
        localStorage.setItem("role", "admin");
        localStorage.setItem("currentUser", user);
        window.location.href = "admin.html";
        return;
    }

    let btn = document.querySelector(".btn-submit");
    if(btn) btn.innerText = "Logging in...";

    if (isFirebaseConfigured()) {
        try {
            // Fetch credentials directly from Firebase
            let response = await fetch(`${FIREBASE_DB_URL}/users/${user}.json`);
            let userData = await response.json();

            if(userData && userData.password === pass){
                localStorage.setItem("role", "student");
                localStorage.setItem("currentUser", user);
                window.location.href = "test.html";
            } else {
                alert("Invalid username or password!");
                if(btn) btn.innerText = "Sign In / Login";
            }
        } catch (error) {
            alert("Database Error: " + error.message);
            if(btn) btn.innerText = "Sign In / Login";
        }
    } else {
        // Local fallback
        let users = getLocalUsers();
        let validUser = users.find(u => u.username === user && u.password === pass);

        if(validUser){
            localStorage.setItem("role", "student");
            localStorage.setItem("currentUser", user);
            window.location.href = "test.html";
        } else {
            alert("Invalid username or password! (Local Check)");
            if(btn) btn.innerText = "Sign In / Login";
        }
    }
}

// =======================
// ADMIN USERS PANEL
// =======================
async function loadAdminUsers() {
    let tbody = document.getElementById("usersTableBody");
    if(!tbody) return;
    tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding: 15px;'>Connecting to Database...</td></tr>";

    if (isFirebaseConfigured()) {
        try {
            let response = await fetch(`${FIREBASE_DB_URL}/users.json`);
            let data = await response.json();

            tbody.innerHTML = "";
            if (!data) {
                tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding: 15px;'>No users registered in Firebase yet.</td></tr>";
                return;
            }

            let index = 1;
            for (let key in data) {
                let u = data[key];
                let name = (u.firstname || "") + " " + (u.lastname || "");
                if(name.trim() === "") name = "N/A";

                let tr = document.createElement("tr");
                tr.innerHTML = `
                    <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${index++}</td>
                    <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${name}</td>
                    <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${u.username}</td>
                    <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${u.registerDate}</td>
                    <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <button style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight: 500;" onclick="deleteUser('${key}')">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            }
        } catch(e) {
            tbody.innerHTML = `<tr><td colspan='5' style='text-align:center; padding: 15px; color: #ef4444;'>Error loading users: Check your DB URL.</td></tr>`;
        }
    } else {
        // Local fallback
        let users = getLocalUsers();
        tbody.innerHTML = "";
        
        if(users.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding: 15px;'>No users registered locally yet. (Add Firebase)</td></tr>";
            return;
        }

        users.forEach((u, index) => {
            let name = (u.firstname || "") + " " + (u.lastname || "");
            if(name.trim() === "") name = "N/A";
            let tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${index + 1}</td>
                <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${name}</td>
                <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${u.username}</td>
                <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${u.registerDate}</td>
                <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <button style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight: 500;" onclick="deleteUser('${u.username}')">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

async function deleteUser(username) {
    if(confirm("Are you sure you want to delete user: " + username + "?")) {
        if (isFirebaseConfigured()) {
            try {
                await fetch(`${FIREBASE_DB_URL}/users/${username}.json`, { method: "DELETE" });
                alert("User removed safely from Firebase.");
                loadAdminUsers();
            } catch (error) {
                alert("Error deleting user: " + error.message);
            }
        } else {
            let users = getLocalUsers();
            users = users.filter(u => u.username !== username);
            saveLocalUsers(users);
            loadAdminUsers();
            alert("User deleted locally.");
        }
    }
}

// =======================
// SESSION & AUTH SECRECY
// =======================
function checkAuth(){
    let role = localStorage.getItem("role");
    if(!role){
        window.location.href = "login.html";
        return false;
    }
    return true;
}

function checkAdmin(){
    let role = localStorage.getItem("role");
    if(!role) return; // handled by checkAuth
    if(role !== "admin"){
        alert("Access denied! This area is for admins only.");
        window.location.href = "login.html";
    }
}

function logout(){
    localStorage.removeItem("role");
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
}