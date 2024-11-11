(function(window, document) {
    // Ensure that Firebase SDK is loaded
    if (typeof firebase === 'undefined') {
        console.error("Firebase SDK not detected. Please include Firebase SDK before including auth.js.");
        return;
    }

    // Ensure that customData is defined
    if (typeof window.customData === 'undefined') {
        console.error("window.customData is not defined. Please define it before including auth.js.");
        return;
    }

    // Retrieve variables from window.customData
    var emailId = window.customData.emailId;
    var passwordId = window.customData.passwordId;
    var buttonId = window.customData.buttonId;
    var snippetId = window.customData.snippetId;
    var apiKey = window.customData.apiKey;

    // Validate the variables
    if (!emailId || !passwordId || !buttonId || !apiKey) {
        console.error("One or more required variables are missing in window.customData.");
        return;
    }

    // Retrieve elements based on IDs provided
    var emailElem = document.getElementById(emailId);
    var passwordElem = document.getElementById(passwordId);
    var submitButton = document.getElementById(buttonId);

    if (!emailElem || !passwordElem || !submitButton) {
        console.error("One or more elements not found. Please ensure the IDs are correct.");
        return;
    }

    // Initialize your personal Firebase app
    var personalFirebaseConfig = {
        apiKey: "AIzaSyCL4OGS5iqPsIJdEalzCunZmcdj7X37iqs",
        authDomain: "fire-snippets-76780.firebaseapp.com",
        projectId: "fire-snippets-76780",
        storageBucket: "fire-snippets-76780.appspot.com",
        messagingSenderId: "374460812043",
        appId: "1:374460812043:web:be34564f20ea70a318300e"
    };

    // Initialize your Firebase app
    if (!firebase.apps.some(app => app.name === "PersonalApp")) {
        firebase.initializeApp(personalFirebaseConfig, "PersonalApp");
    }

    // Get Firestore instance for your app
    var db = firebase.firestore(firebase.app("PersonalApp"));

    // Function to search workspaces for a matching apiKey
    async function findWorkspaceWithApiKey() {
        let foundWorkspaceConfig = null;

        // Get all users
        const usersSnapshot = await db.collection("Users").get();

        for (let userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;

            // Get all workspaces for the user
            const workspacesSnapshot = await db.collection(`Users/${userId}/workspaces`).get();

            for (let workspaceDoc of workspacesSnapshot.docs) {
                if (workspaceDoc.data().apiKey === apiKey) {
                    foundWorkspaceConfig = workspaceDoc.data().firebaseConfig;
                    break;
                }
            }

            if (foundWorkspaceConfig) {
                break;
            }
        }

        return foundWorkspaceConfig;
    }

    // Add click listener to the submit button
    submitButton.addEventListener('click', function() {
        var emailValue = emailElem.value;
        var passwordValue = passwordElem.value;

        if (!emailValue || !passwordValue) {
            console.error("Email or password is empty.");
            return;
        }

        // Search for the workspace with the matching apiKey
        findWorkspaceWithApiKey().then(function(userFirebaseConfig) {
            if (userFirebaseConfig) {
                // Initialize user's Firebase app
                var userAppName = "UserApp";
                var userApp;
                if (!firebase.apps.some(app => app.name === userAppName)) {
                    userApp = firebase.initializeApp(userFirebaseConfig, userAppName);
                } else {
                    userApp = firebase.app(userAppName);
                }

                // Authenticate the user using their Firebase app
                var userAuth = firebase.auth(userApp);
                userAuth.signInWithEmailAndPassword(emailValue, passwordValue)
                    .then(function(userCredential) {
                        console.log("User logged in successfully");
                        // Proceed with post-login actions here
                    })
                    .catch(function(error) {
                        console.error("Error logging in:", error.code, error.message);
                    });
            } else {
                console.error("No workspace found with the provided apiKey.");
            }
        }).catch(function(error) {
            console.error("Error fetching user data:", error);
        });
    });
})(window, document);
