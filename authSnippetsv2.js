class FireSnippets {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.db = null;
        this.workspaceConfig = null;

        // Initialize personal Firebase app
        this.personalFirebaseConfig = {
            apiKey: "AIzaSyCL4OGS5iqPsIJdEalzCunZmcdj7X37iqs",
            authDomain: "fire-snippets-76780.firebaseapp.com",
            projectId: "fire-snippets-76780",
            storageBucket: "fire-snippets-76780.appspot.com",
            messagingSenderId: "374460812043",
            appId: "1:374460812043:web:be34564f20ea70a318300e"
        };

        this.initializeFirebase();
    }

    initializeFirebase() {
        if (typeof firebase === 'undefined') {
            console.error("Firebase SDK not detected. Please include Firebase SDK.");
            return;
        }

        // Initialize Firebase app if not already initialized
        if (!firebase.apps.some(app => app.name === "PersonalApp")) {
            firebase.initializeApp(this.personalFirebaseConfig, "PersonalApp");
        }

        // Get Firestore instance
        this.db = firebase.firestore(firebase.app("PersonalApp"));
        //await this.findWorkspaceByApiKey();
    }

    // Function to find workspace by apiKey
    async findWorkspaceByApiKey() {
        if (!this.db) {
            console.error("Firestore database not initialized.");
            return;
        }

        // Query to find the workspace with the specified apiKey
        const workspacesQuery = await this.db.collectionGroup("workspaces")
            .where("apiKey", "==", this.apiKey)
            .limit(1) // Limit to 1 to stop after finding the first match
            .get();

        if (workspacesQuery.empty) {
            console.error("No workspace found with the specified apiKey.");
            return;
        }

        const workspaceDoc = workspacesQuery.docs[0];
        this.workspaceConfig = workspaceDoc.data().firebaseConfig;
        this.workspacePath = workspaceDoc.ref.path;

        console.log("Workspace found and configured.");
    }

    // Function to find snippet by snippetId
    async findSnippetById(snippetId) {
        if(this.workspaceConfig == null){
            await this.findWorkspaceByApiKey();
        }

        if (!this.db) {
            console.error("Firestore database not initialized.");
            return null;
        }

        if (!this.workspacePath) {
            console.error("Workspace not found. Please ensure findWorkspaceByApiKey() is called first.");
            return null;
        }

        // Attempt to retrieve snippet document within the located workspace
        const snippetDocRef = this.db.doc(`${this.workspacePath}/snippets/${snippetId}`);
        const snippetDoc = await snippetDocRef.get();

        if (!snippetDoc.exists) {
            console.error("Snippet not found with the provided snippetId.");
            return null;
        }

        const snippetData = snippetDoc.data();
        //console.log(snippetData);
        const foundWorkspaceConfig = this.workspaceConfig;
        //console.log(wc);
        return { foundWorkspaceConfig, snippetData };
    }


    // Function to search workspaces for a matching apiKey and snippet
    /*async findWorkspaceAndSnippet(snippetId) {
        if (!this.db) {
            console.error("Firestore database not initialized.");
            return null;
        }

        let foundWorkspaceConfig = null;
        let snippetData = null;

        // Get all users
        const usersSnapshot = await this.db.collection("Users").get();

        for (let userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;

            // Get all workspaces for the user
            const workspacesSnapshot = await this.db.collection(`Users/${userId}/workspaces`).get();

            for (let workspaceDoc of workspacesSnapshot.docs) {
                if (workspaceDoc.data().apiKey === this.apiKey) {
                    foundWorkspaceConfig = workspaceDoc.data().firebaseConfig;

                    // Attempt to retrieve snippet document
                    const snippetDoc = await this.db.doc(`Users/${userId}/workspaces/${workspaceDoc.id}/snippets/${snippetId}`).get();
                    if (snippetDoc.exists) {
                        snippetData = snippetDoc.data();
                    } else {
                        console.error("Snippet not found with the provided snippetId.");
                    }
                    break;
                }
            }

            if (foundWorkspaceConfig && snippetData) {
                break;
            }
        }

        return { foundWorkspaceConfig, snippetData };
    }*/

    // Function to handle login using snippetId
    login(snippetId, onSuccess, onFailure) {
        return new Promise((resolve, reject) => {
            this.findSnippetById(snippetId).then(async ({ foundWorkspaceConfig, snippetData }) => {
                if (!foundWorkspaceConfig || !snippetData) {
                    console.error("No workspace or snippet found with the provided apiKey and snippetId.");
                    onFailure && onFailure("No workspace or snippet found with the provided apiKey and snippetId.");
                    return resolve(null);
                }

                const { emailElementId, passwordElementId, buttonElementId } = snippetData;

                // Retrieve elements based on the fields from snippetData
                const emailElem = document.getElementById(emailElementId);
                const passwordElem = document.getElementById(passwordElementId);
                const submitButton = document.getElementById(buttonElementId);

                if (!emailElem || !passwordElem || !submitButton) {
                    console.error("One or more elements specified in the snippet not found.");
                    onFailure && onFailure("One or more elements specified in the snippet not found.");
                    return resolve(null);
                }

                // Attach an onclick listener to the submit button
                submitButton.onclick = async () => {
                    const emailValue = emailElem.value;
                    const passwordValue = passwordElem.value;

                    if (!emailValue || !passwordValue) {
                        console.error("Email or password is empty.");
                        onFailure && onFailure("Email or password is empty.");
                        return resolve(null);
                    }

                    // Initialize user's Firebase app
                    const userAppName = "UserApp";
                    let userApp;
                    if (!firebase.apps.some(app => app.name === userAppName)) {
                        userApp = firebase.initializeApp(foundWorkspaceConfig, userAppName);
                    } else {
                        userApp = firebase.app(userAppName);
                    }

                    // Authenticate the user using their Firebase app
                    const userAuth = firebase.auth(userApp);
                    try {
                        const userCredential = await userAuth.signInWithEmailAndPassword(emailValue, passwordValue);
                        console.log("User logged in successfully");
                        onSuccess && onSuccess(userCredential); // Call onSuccess callback if login is successful
                        resolve(userCredential);
                    } catch (error) {
                        console.error("Error logging in:", error.code, error.message);
                        onFailure && onFailure(error.message); // Call onFailure callback if login fails
                        reject(error);
                    }
                };
            }).catch(error => {
                console.error("Error fetching workspace or snippet:", error);
                onFailure && onFailure("Error fetching workspace or snippet.");
                reject(error);
            });
        });
    }

    signUp(snippetId, onSuccess, onFailure) {
        return new Promise((resolve, reject) => {
            this.findSnippetById(snippetId).then(async ({ foundWorkspaceConfig, snippetData }) => {
                if (!foundWorkspaceConfig || !snippetData) {
                    console.error("No workspace or snippet found with the provided apiKey and snippetId.");
                    onFailure && onFailure("No workspace or snippet found with the provided apiKey and snippetId.");
                    return resolve(null);
                }

                const { emailElementId, passwordElementId, buttonElementId, fieldMappings } = snippetData;

                console.log(fieldMappings);

                // Retrieve elements based on the fields from snippetData
                const emailElem = document.getElementById(emailElementId);
                const passwordElem = document.getElementById(passwordElementId);
                const submitButton = document.getElementById(buttonElementId);

                if (!emailElem || !passwordElem || !submitButton) {
                    console.error("One or more elements specified in the snippet not found.");
                    onFailure && onFailure("One or more elements specified in the snippet not found.");
                    return resolve(null);
                }

                // Attach an onclick listener to the submit button
                submitButton.onclick = async () => {
                    const emailValue = emailElem.value;
                    const passwordValue = passwordElem.value;

                    if (!emailValue || !passwordValue) {
                        console.error("Email or password is empty.");
                        onFailure && onFailure("Email or password is empty.");
                        return resolve(null);
                    }

                    // Initialize user's Firebase app
                    const userAppName = "UserApp";
                    let userApp;
                    if (!firebase.apps.some(app => app.name === userAppName)) {
                        userApp = firebase.initializeApp(foundWorkspaceConfig, userAppName);
                    } else {
                        userApp = firebase.app(userAppName);
                    }

                    // Authenticate the user using their Firebase app
                    const userAuth = firebase.auth(userApp);
                    try {
                        // Sign up the user
                        const userCredential = await userAuth.createUserWithEmailAndPassword(emailValue, passwordValue);
                        console.log("User signed up successfully");

                        // Prepare data to save to Firestore
                        const userData = { email: emailValue };  // Include email field

                        // Retrieve additional field values from fieldMappings
                        if (Array.isArray(fieldMappings)) {
                            fieldMappings.forEach(mapping => {
                                const { field, elementId } = mapping;
                                const element = document.getElementById(elementId);
                                if (element) {
                                    userData[field] = element.value; // Save the value with the field name as key
                                }
                            });
                        }

                        // Save user data to Firestore in TheUsers collection
                        const firestore = firebase.firestore(userApp);
                        await firestore.collection("TheUsers").doc(userCredential.user.uid).set(userData);

                        onSuccess && onSuccess(userCredential); // Call onSuccess callback if sign-up is successful

                        resolve(userCredential);
                    } catch (error) {
                        console.error("Error signing up:", error.code, error.message);
                        onFailure && onFailure(error.message); // Call onFailure callback if sign-up fails
                        reject(error);
                    }
                };
            }).catch(error => {
                console.error("Error fetching workspace or snippet:", error);
                onFailure && onFailure("Error fetching workspace or snippet.");
                reject(error);
            });
        });
    }

    /*OLD STATIC DISPLAYstaticDisplay(snippetId, variables, onSuccess, onFailure) {
        return new Promise((resolve, reject) => {
        this.findWorkspaceAndSnippet(snippetId).then(async ({ foundWorkspaceConfig, snippetData }) => {
            if (!foundWorkspaceConfig || !snippetData) {
                console.error("No workspace or snippet found with the provided apiKey and snippetId.");
                onFailure && onFailure("No workspace or snippet found with the provided apiKey and snippetId.");
                return;
            }

            const { pathSegments, fieldMappings } = snippetData;

            if (!Array.isArray(pathSegments) || !Array.isArray(fieldMappings)) {
                console.error("Invalid pathSegments or fieldMappings in snippetData.");
                onFailure && onFailure("Invalid pathSegments or fieldMappings in snippetData.");
                return;
            }

            // Replace placeholders in pathSegments using variables
            const resolvedPathSegments = pathSegments.map(segment => {
                if (segment.type === "document" || segment.type === "collection") {
                    let resolvedValue = segment.value;
                    variables.forEach(variable => {
                        const placeholder = `$${variable.name}`;
                        console.log(placeholder, " and ", resolvedValue);
                        if (resolvedValue.includes(placeholder)) {
                            resolvedValue = resolvedValue.replace(placeholder, variable.value);
                        }
                    });
                    return { type: segment.type, value: resolvedValue };
                }
                return segment;
            });

            console.log(resolvedPathSegments);

            // Construct the Firestore path from resolvedPathSegments
            let firestorePath = '';
            resolvedPathSegments.forEach((segment, index) => {
                firestorePath += `${segment.value}${index < resolvedPathSegments.length - 1 ? '/' : ''}`;
            });

            console.log(firestorePath);

            try {
                // Initialize the user's Firebase app if not already done
                const userAppName = "UserApp";
                let userApp;
                if (!firebase.apps.some(app => app.name === userAppName)) {
                    userApp = firebase.initializeApp(foundWorkspaceConfig, userAppName);
                } else {
                    userApp = firebase.app(userAppName);
                }

                // Retrieve Firestore instance for user app
                const firestore = firebase.firestore(userApp);

                // Fetch document data from Firestore using the constructed path
                const docSnapshot = await firestore.doc(firestorePath).get();

                if (!docSnapshot.exists) {
                    console.error("Document not found at the specified path.");
                    onFailure && onFailure("Document not found at the specified path.");
                    return;
                }

                const docData = docSnapshot.data();

                // Set the values of elements based on fieldMappings
                fieldMappings.forEach(mapping => {
                    const { field, elementId } = mapping;
                    const element = document.getElementById(elementId);
                    if (element && docData.hasOwnProperty(field)) {
                        element.textContent = docData[field]; // Set the retrieved data to the element
                    }
                });

                onSuccess && onSuccess(docData); // Call onSuccess callback if data display is successful
            } catch (error) {
                console.error("Error fetching document or displaying data:", error);
                onFailure && onFailure("Error fetching document or displaying data.");
                reject(error);
            }
        }).catch(error => {
            console.error("Error fetching workspace or snippet:", error);
            onFailure && onFailure("Error fetching workspace or snippet.");
            reject(error);
        });

    });
    }*/

    /*WITHOUT FILTERING--staticDisplay(snippetId, variables, onSuccess, onFailure, onSnippet) {
        return new Promise((resolve, reject) => {
            this.findWorkspaceAndSnippet(snippetId).then(async ({ foundWorkspaceConfig, snippetData }) => {
                if (!foundWorkspaceConfig || !snippetData) {
                    console.error("No workspace or snippet found with the provided apiKey and snippetId.");
                    onFailure && onFailure("No workspace or snippet found with the provided apiKey and snippetId.");
                    return resolve(null);
                }

                const { pathSegments, fieldMappings, realTimeUpdatesOn } = snippetData;

                if (!Array.isArray(pathSegments) || !Array.isArray(fieldMappings)) {
                    console.error("Invalid pathSegments or fieldMappings in snippetData.");
                    onFailure && onFailure("Invalid pathSegments or fieldMappings in snippetData.");
                    return resolve(null);
                }

                // Replace placeholders in pathSegments using variables
                const resolvedPathSegments = pathSegments.map(segment => {
                    if (segment.type === "document" || segment.type === "collection") {
                        let resolvedValue = segment.value;
                        variables.forEach(variable => {
                            const placeholder = `$${variable.name}`;
                            if (resolvedValue.includes(placeholder)) {
                                resolvedValue = resolvedValue.replace(placeholder, variable.value);
                            }
                        });
                        return { type: segment.type, value: resolvedValue };
                    }
                    return segment;
                });

                // Construct the Firestore path from resolvedPathSegments
                let firestorePath = '';
                resolvedPathSegments.forEach((segment, index) => {
                    firestorePath += `${segment.value}${index < resolvedPathSegments.length - 1 ? '/' : ''}`;
                });

                try {
                    // Initialize the user's Firebase app if not already done
                    const userAppName = "UserApp";
                    let userApp;
                    if (!firebase.apps.some(app => app.name === userAppName)) {
                        userApp = firebase.initializeApp(foundWorkspaceConfig, userAppName);
                    } else {
                        userApp = firebase.app(userAppName);
                    }

                    // Retrieve Firestore instance for user app
                    const firestore = firebase.firestore(userApp);

                    // Function to process and display the document data
                    const processDocument = (docSnapshot) => {
                        if (!docSnapshot.exists) {
                            console.error("Document not found at the specified path.");
                            onFailure && onFailure("Document not found at the specified path.");
                            return resolve(null);
                        }

                        const docData = docSnapshot.data();

                        // Set the values of elements based on fieldMappings
                        fieldMappings.forEach(mapping => {
                            const { field, elementId } = mapping;
                            const element = document.getElementById(elementId);
                            if (element && docData.hasOwnProperty(field)) {
                                element.textContent = docData[field]; // Set the retrieved data to the element
                            }
                        });

                        onSuccess && onSuccess(docData); // Call onSuccess callback if data display is successful
                    };

                    // Initialize unsubscribe function (for real-time updates)
                    let unsubscribe = null;

                    // Check if real-time updates are enabled
                    if (realTimeUpdatesOn) {
                        // Set up Firestore onSnapshot listener for real-time updates
                        unsubscribe = firestore.doc(firestorePath).onSnapshot(
                            (docSnapshot) => processDocument(docSnapshot),
                            (error) => {
                                console.error("Error fetching real-time updates:", error);
                                onFailure && onFailure("Error fetching real-time updates.");
                                reject(error);
                            }
                        );
                    } else {
                        // Fetch data once without real-time updates
                        const docSnapshot = await firestore.doc(firestorePath).get();
                        processDocument(docSnapshot);
                    }

                    // Create an object with an unsubscribe method if real-time updates are on
                    const snippetObject = {
                        unsubscribe: () => {
                            if (unsubscribe) {
                                unsubscribe();
                            }
                        },
                    };

                    // Call onSnippet callback with the snippetObject
                    onSnippet && onSnippet(snippetObject);

                    // Resolve the promise with the snippetObject
                    resolve(snippetObject);
                } catch (error) {
                    console.error("Error fetching document or displaying data:", error);
                    onFailure && onFailure("Error fetching document or displaying data.");
                    reject(error);
                }
            }).catch(error => {
                console.error("Error fetching workspace or snippet:", error);
                onFailure && onFailure("Error fetching workspace or snippet.");
                reject(error);
            });
        });
    }*/

    staticDisplay(snippetId, variables, onSuccess, onFailure, onSnippet) {
        return new Promise((resolve, reject) => {
            this.findSnippetById(snippetId).then(async ({ foundWorkspaceConfig, snippetData }) => {
                if (!foundWorkspaceConfig || !snippetData) {
                    console.error("No workspace or snippet found with the provided apiKey and snippetId.");
                    onFailure && onFailure("No workspace or snippet found with the provided apiKey and snippetId.");
                    return resolve(null);
                }

                const {
                    pathSegments,
                    fieldMappings,
                    realTimeUpdatesOn,
                    queryConditions,
                    queryOrders,
                } = snippetData;

                if (!Array.isArray(pathSegments) || !Array.isArray(fieldMappings)) {
                    console.error("Invalid pathSegments or fieldMappings in snippetData.");
                    onFailure && onFailure("Invalid pathSegments or fieldMappings in snippetData.");
                    return resolve(null);
                }

                // Replace placeholders in pathSegments using variables
                const resolvedPathSegments = pathSegments.map(segment => {
                    if (segment.type === "document" || segment.type === "collection") {
                        let resolvedValue = segment.value;
                        variables.forEach(variable => {
                            const placeholder = `$${variable.name}`;
                            if (resolvedValue.includes(placeholder)) {
                                resolvedValue = resolvedValue.replace(placeholder, variable.value);
                            }
                        });
                        return { type: segment.type, value: resolvedValue };
                    }
                    return segment;
                });

                try {
                    // Initialize the user's Firebase app if not already done
                    const userAppName = "UserApp";
                    let userApp;
                    if (!firebase.apps.some(app => app.name === userAppName)) {
                        userApp = firebase.initializeApp(foundWorkspaceConfig, userAppName);
                    } else {
                        userApp = firebase.app(userAppName);
                    }

                    // Retrieve Firestore instance for user app
                    const firestore = firebase.firestore(userApp);

                    // Build the Firestore path from resolvedPathSegments
                    // We'll assume the path ends with a collection to apply filters
                    let firestorePath = '';
                    resolvedPathSegments.forEach((segment, index) => {
                        firestorePath += `${segment.value}${index < resolvedPathSegments.length - 1 ? '/' : ''}`;
                    });

                    // Get the last segment type to determine if we're dealing with a collection or document
                    const lastSegment = resolvedPathSegments[resolvedPathSegments.length - 1];

                    // Function to process and display the document data
                    const processDocuments = (snapshot) => {
                        if (snapshot.empty) {
                            console.error("No documents found at the specified path with the given filters.");
                            onFailure && onFailure("No documents found at the specified path with the given filters.");
                            return resolve(null);
                        }

                        snapshot.forEach(docSnapshot => {
                            const docData = docSnapshot.data();

                            // Set the values of elements based on fieldMappings
                            fieldMappings.forEach(mapping => {
                                const { field, elementId } = mapping;
                                const element = document.getElementById(elementId);
                                if (element && docData.hasOwnProperty(field)) {
                                    element.textContent = docData[field]; // Set the retrieved data to the element
                                }
                            });
                        });

                        onSuccess && onSuccess(snapshot.docs.map(doc => doc.data())); // Call onSuccess callback if data display is successful
                    };

                    // Initialize unsubscribe function (for real-time updates)
                    let unsubscribe = null;

                    // Construct the query
                    let queryRef;

                    if (lastSegment.type === 'collection') {
                        // If the path ends with a collection, we can apply filters
                        queryRef = firestore.collection(firestorePath);

                        // Handle queryConditions
                        if (Array.isArray(queryConditions) && queryConditions.length > 0) {
                            // Firestore does not support 'OR' queries directly
                            const hasOrCondition = queryConditions.some(cond => cond.logicalOperator === 'OR');
                            if (hasOrCondition) {
                                console.error("Firestore does not support 'OR' queries in this manner.");
                                onFailure && onFailure("Firestore does not support 'OR' queries directly. Please revise your query conditions.");
                                return resolve(null);
                            }

                            // Apply 'AND' conditions
                            queryConditions.forEach(condition => {
                                let field = condition.field;
                                let operator = condition.operator;
                                let value = condition.value;

                                // Resolve variables in field
                                if (field.includes('$')) {
                                    variables.forEach(variable => {
                                        const placeholder = `$${variable.name}`;
                                        if (field.includes(placeholder)) {
                                            field = field.replace(placeholder, variable.value);
                                        }
                                    });
                                }

                                // Resolve variables in value
                                if (typeof value === 'string' && value.startsWith('$')) {
                                    const variableName = value.substring(1); // Remove $
                                    const variable = variables.find(v => v.name === variableName);
                                    if (variable) {
                                        value = variable.value;
                                    } else {
                                        console.error(`Variable ${value} not provided.`);
                                        onFailure && onFailure(`Variable ${value} not provided.`);
                                        return resolve(null);
                                    }
                                }

                                // Convert value to appropriate type if needed
                                value = this.parseValue(value);

                                // Apply where clause
                                queryRef = queryRef.where(field, operator, value);
                            });
                        }

                        // Apply queryOrders if any
                        if (Array.isArray(queryOrders)) {
                            queryOrders.forEach(order => {
                                let field = order.field;

                                // Resolve variables in field if any
                                if (field.includes('$')) {
                                    variables.forEach(variable => {
                                        const placeholder = `$${variable.name}`;
                                        if (field.includes(placeholder)) {
                                            field = field.replace(placeholder, variable.value);
                                        }
                                    });
                                }

                                queryRef = queryRef.orderBy(field, order.direction);
                            });
                        }

                        // Check if real-time updates are enabled
                        if (realTimeUpdatesOn) {
                            // Set up Firestore onSnapshot listener for real-time updates
                            unsubscribe = queryRef.onSnapshot(
                                (snapshot) => processDocuments(snapshot),
                                (error) => {
                                    console.error("Error fetching real-time updates:", error);
                                    onFailure && onFailure("Error fetching real-time updates.");
                                    reject(error);
                                }
                            );
                        } else {
                            // Fetch data once without real-time updates
                            const snapshot = await queryRef.get();
                            processDocuments(snapshot);
                        }

                    } else if (lastSegment.type === 'document') {
                        // If the path ends with a document, we cannot apply filters
                        const docRef = firestore.doc(firestorePath);

                        const processDocument = (docSnapshot) => {
                            if (!docSnapshot.exists) {
                                console.error("Document not found at the specified path.");
                                onFailure && onFailure("Document not found at the specified path.");
                                return resolve(null);
                            }

                            const docData = docSnapshot.data();

                            // Set the values of elements based on fieldMappings
                            fieldMappings.forEach(mapping => {
                                const { field, elementId } = mapping;
                                const element = document.getElementById(elementId);
                                if (element && docData.hasOwnProperty(field)) {
                                    element.textContent = docData[field]; // Set the retrieved data to the element
                                }
                            });

                            onSuccess && onSuccess(docData); // Call onSuccess callback if data display is successful
                        };

                        // Check if real-time updates are enabled
                        if (realTimeUpdatesOn) {
                            // Set up Firestore onSnapshot listener for real-time updates
                            unsubscribe = docRef.onSnapshot(
                                (docSnapshot) => processDocument(docSnapshot),
                                (error) => {
                                    console.error("Error fetching real-time updates:", error);
                                    onFailure && onFailure("Error fetching real-time updates.");
                                    reject(error);
                                }
                            );
                        } else {
                            // Fetch data once without real-time updates
                            const docSnapshot = await docRef.get();
                            processDocument(docSnapshot);
                        }

                    } else {
                        console.error("Invalid path ending. Path must end with a collection or document.");
                        onFailure && onFailure("Invalid path ending. Path must end with a collection or document.");
                        return resolve(null);
                    }

                    // Create an object with an unsubscribe method if real-time updates are on
                    const snippetObject = {
                        unsubscribe: () => {
                            if (unsubscribe) {
                                unsubscribe();
                            }
                        },
                    };

                    // Call onSnippet callback with the snippetObject
                    onSnippet && onSnippet(snippetObject);

                    // Resolve the promise with the snippetObject
                    resolve(snippetObject);
                } catch (error) {
                    console.error("Error fetching data or displaying content:", error);
                    onFailure && onFailure("Error fetching data or displaying content.");
                    reject(error);
                }
            }).catch(error => {
                console.error("Error fetching workspace or snippet:", error);
                onFailure && onFailure("Error fetching workspace or snippet.");
                reject(error);
            });
        });
    }


    /*WITHOUT FILTERS - TESTED - dynamicDisplay(snippetId, variables, onSuccess, onFailure, onSnippet) {
        return new Promise((resolve, reject) => {
            this.findWorkspaceAndSnippet(snippetId).then(async ({ foundWorkspaceConfig, snippetData }) => {
                if (!foundWorkspaceConfig || !snippetData) {
                    console.error("No workspace or snippet found with the provided apiKey and snippetId.");
                    onFailure && onFailure("No workspace or snippet found with the provided apiKey and snippetId.");
                    return resolve(null);
                }

                const { pathSegments, fieldMappings, dynamicSnippetItemCode, containerElementId, realTimeUpdatesOn } = snippetData;

                if (!Array.isArray(pathSegments) || !Array.isArray(fieldMappings) || !dynamicSnippetItemCode || !containerElementId) {
                    console.error("Invalid pathSegments, fieldMappings, dynamicSnippetItemCode, or containerElementId in snippetData.");
                    onFailure && onFailure("Invalid snippet configuration.");
                    return resolve(null);
                }

                // Resolve pathSegments using variables
                const resolvedPathSegments = pathSegments.map(segment => {
                    if (segment.type === "collection" || segment.type === "document") {
                        let resolvedValue = segment.value;
                        variables.forEach(variable => {
                            const placeholder = `$${variable.name}`;
                            if (resolvedValue.includes(placeholder)) {
                                resolvedValue = resolvedValue.replace(placeholder, variable.value);
                            }
                        });
                        return { type: segment.type, value: resolvedValue };
                    }
                    return segment;
                });

                // Construct the Firestore path from resolvedPathSegments, which will end in a collection
                let firestorePath = '';
                resolvedPathSegments.forEach((segment, index) => {
                    firestorePath += `${segment.value}${index < resolvedPathSegments.length - 1 ? '/' : ''}`;
                });

                try {
                    // Initialize the user's Firebase app if not already done
                    const userAppName = "UserApp";
                    let userApp;
                    if (!firebase.apps.some(app => app.name === userAppName)) {
                        userApp = firebase.initializeApp(foundWorkspaceConfig, userAppName);
                    } else {
                        userApp = firebase.app(userAppName);
                    }

                    // Retrieve Firestore instance for user app
                    const firestore = firebase.firestore(userApp);

                    // Get the container element where items will be appended
                    const containerElement = document.getElementById(containerElementId);
                    if (!containerElement) {
                        console.error("Container element not found.");
                        onFailure && onFailure("Container element not found.");
                        return resolve(null);
                    }

                    // Clear any existing content in the container
                    containerElement.innerHTML = '';

                    // Function to process the template with conditional rendering
                    const processTemplate = (template, data) => {
                        // Regular expression to match conditional blocks
                        const conditionalRegex = /(if|else\s*if|else)\s*\((.*?)\)\s*\{([\s\S]*?)\}/g;
                        let result = '';
                        let lastIndex = 0;
                        let conditionMet = false;

                        let match;
                        while ((match = conditionalRegex.exec(template)) !== null) {
                            const [fullMatch, conditionType, conditionExpr, content] = match;
                            const startIndex = match.index;
                            const endIndex = conditionalRegex.lastIndex;

                            // Append any text before the conditional block
                            result += template.substring(lastIndex, startIndex);

                            if (!conditionMet || conditionType === 'else') {
                                let conditionPassed = false;
                                if (conditionType === 'else') {
                                    conditionPassed = true;
                                } else {
                                    // Replace placeholders in the condition
                                    let evaluatedCondition = conditionExpr.replace(/#(\w+)/g, (placeholder, fieldName) => {
                                        const value = data[fieldName];
                                        if (typeof value === 'string') {
                                            return `"${value}"`;
                                        } else {
                                            return value;
                                        }
                                    });

                                    // Safely evaluate the condition
                                    conditionPassed = evaluateCondition(evaluatedCondition);
                                }

                                if (conditionPassed) {
                                    // Process content within the conditional block
                                    const processedContent = content.replace(/#(\w+)/g, (placeholder, fieldName) => {
                                        return data[fieldName] !== undefined ? data[fieldName] : '';
                                    });
                                    result += processedContent;
                                    conditionMet = true;
                                }
                            }

                            lastIndex = endIndex;
                        }

                        // Append any remaining text after the last conditional block
                        result += template.substring(lastIndex);

                        // Replace any remaining placeholders
                        result = result.replace(/#(\w+)/g, (placeholder, fieldName) => {
                            return data[fieldName] !== undefined ? data[fieldName] : '';
                        });

                        return result;
                    };

                    // Function to safely evaluate a condition
                    const evaluateCondition = (condition) => {
                        try {
                            // Only allow certain operators and patterns
                            const allowedPattern = /^[\s\w"'><=!.&|()]+$/;
                            if (!allowedPattern.test(condition)) {
                                throw new Error('Invalid characters in condition.');
                            }

                            // Disallow accessing properties like constructor, prototype, etc.
                            const disallowedPattern = /(\bconstructor\b|\bprototype\b|\b__proto__\b)/;
                            if (disallowedPattern.test(condition)) {
                                throw new Error('Disallowed property access in condition.');
                            }

                            // Evaluate the condition
                            return Function('"use strict"; return (' + condition + ')')();
                        } catch (e) {
                            console.error("Error evaluating condition:", e);
                            return false;
                        }
                    };

                    // Define the function to render content
                    const renderContent = (snapshot) => {
                        containerElement.innerHTML = ''; // Clear existing content

                        snapshot.forEach(docSnapshot => {
                            const docData = docSnapshot.data();

                            // Process the template with the document data
                            const processedHTML = processTemplate(dynamicSnippetItemCode, docData);

                            // Create a temporary element to hold the processed HTML
                            const tempElement = document.createElement('div');
                            tempElement.innerHTML = processedHTML;

                            // Append the populated item to the container
                            if (tempElement.firstElementChild) {
                                containerElement.appendChild(tempElement.firstElementChild);
                            }
                        });

                        onSuccess && onSuccess(snapshot);
                    };

                    // Initialize unsubscribe function (for real-time updates)
                    let unsubscribe = null;

                    // Check if real-time updates are enabled
                    if (realTimeUpdatesOn) {
                        // Set up Firestore onSnapshot listener for real-time updates
                        unsubscribe = firestore.collection(firestorePath).onSnapshot(
                            (snapshot) => renderContent(snapshot),
                            (error) => {
                                console.error("Error fetching real-time updates:", error);
                                onFailure && onFailure("Error fetching real-time updates.");
                            }
                        );
                    } else {
                        // Fetch data once without real-time updates
                        const snapshot = await firestore.collection(firestorePath).get();
                        renderContent(snapshot);
                    }

                    // Return an object with an unsubscribe method if real-time updates are on
                    const onSnippetObj = {
                        unsubscribe: () => {
                            if (unsubscribe) {
                                unsubscribe();
                            }
                        },
                    };
                    onSnippet && onSnippet(onSnippetObj);

                    resolve(onSnippetObj);
                } catch (error) {
                    console.error("Error fetching collection data or displaying items:", error);
                    onFailure && onFailure("Error fetching collection data or displaying items.");
                    reject(error);
                }
            }).catch(error => {
                console.error("Error fetching workspace or snippet:", error);
                onFailure && onFailure("Error fetching workspace or snippet.");
                reject(error);
            });

        });
    }*/

    dynamicDisplay(snippetId, variables, onSuccess, onFailure, onSnippet) {
        return new Promise((resolve, reject) => {
            this.findSnippetById(snippetId).then(async ({ foundWorkspaceConfig, snippetData }) => {
                if (!foundWorkspaceConfig || !snippetData) {
                    console.error("No workspace or snippet found with the provided apiKey and snippetId.");
                    onFailure && onFailure("No workspace or snippet found with the provided apiKey and snippetId.");
                    return resolve(null);
                }

                const {
                    pathSegments,
                    fieldMappings,
                    dynamicSnippetItemCode,
                    containerElementId,
                    realTimeUpdatesOn,
                    queryConditions,
                    queryOrders,
                } = snippetData;

                if (
                    !Array.isArray(pathSegments) ||
                    !Array.isArray(fieldMappings) ||
                    !dynamicSnippetItemCode ||
                    !containerElementId
                ) {
                    console.error("Invalid pathSegments, fieldMappings, dynamicSnippetItemCode, or containerElementId in snippetData.");
                    onFailure && onFailure("Invalid snippet configuration.");
                    return resolve(null);
                }

                // Resolve pathSegments using variables
                const resolvedPathSegments = pathSegments.map(segment => {
                    if (segment.type === "collection" || segment.type === "document") {
                        let resolvedValue = segment.value;
                        variables.forEach(variable => {
                            const placeholder = `$${variable.name}`;
                            if (resolvedValue.includes(placeholder)) {
                                resolvedValue = resolvedValue.replace(placeholder, variable.value);
                            }
                        });
                        return { type: segment.type, value: resolvedValue };
                    }
                    return segment;
                });

                // Construct the Firestore path from resolvedPathSegments, which will end in a collection
                let firestorePath = '';
                resolvedPathSegments.forEach((segment, index) => {
                    firestorePath += `${segment.value}${index < resolvedPathSegments.length - 1 ? '/' : ''}`;
                });

                try {
                    // Initialize the user's Firebase app if not already done
                    const userAppName = "UserApp";
                    let userApp;
                    if (!firebase.apps.some(app => app.name === userAppName)) {
                        userApp = firebase.initializeApp(foundWorkspaceConfig, userAppName);
                    } else {
                        userApp = firebase.app(userAppName);
                    }

                    // Retrieve Firestore instance for user app
                    const firestore = firebase.firestore(userApp);

                    // Get the container element where items will be appended
                    const containerElement = document.getElementById(containerElementId);
                    if (!containerElement) {
                        console.error("Container element not found.");
                        onFailure && onFailure("Container element not found.");
                        return resolve(null);
                    }

                    // Clear any existing content in the container
                    containerElement.innerHTML = '';

                    // Build the Firestore query
                    let collectionRef = firestore.collection(firestorePath);
                    let queryRef = collectionRef;

                    // Handle queryConditions
                    if (Array.isArray(queryConditions) && queryConditions.length > 0) {
                        // Firestore does not support 'OR' queries directly
                        const hasOrCondition = queryConditions.some(cond => cond.logicalOperator === 'OR');
                        if (hasOrCondition) {
                            console.error("Firestore does not support 'OR' queries in this manner.");
                            onFailure && onFailure("Firestore does not support 'OR' queries directly. Please revise your query conditions.");
                            return resolve(null);
                        }

                        // Apply 'AND' conditions
                        queryConditions.forEach(condition => {
                            let field = condition.field;
                            let operator = condition.operator;
                            let value = condition.value;

                            // Resolve variables in field
                            if (field.includes('$')) {
                                variables.forEach(variable => {
                                    const placeholder = `$${variable.name}`;
                                    if (field.includes(placeholder)) {
                                        field = field.replace(placeholder, variable.value);
                                    }
                                });
                            }

                            // Resolve variables in value
                            if (typeof value === 'string' && value.startsWith('$')) {
                                const variableName = value.substring(1); // Remove $
                                const variable = variables.find(v => v.name === variableName);
                                if (variable) {
                                    value = variable.value;
                                } else {
                                    console.error(`Variable ${value} not provided.`);
                                    onFailure && onFailure(`Variable ${value} not provided.`);
                                    return resolve(null);
                                }
                            }

                            console.log("Value before " + value);

                            // Convert value to appropriate type if needed
                            value = this.parseValue(value);

                            console.log("Value is " + value);

                            // Apply where clause
                            queryRef = queryRef.where(field, operator, value);
                        });
                    }

                    // Apply queryOrders if any
                    if (Array.isArray(queryOrders)) {
                        queryOrders.forEach(order => {
                            let field = order.field;

                            // Resolve variables in field if any
                            if (field.includes('$')) {
                                variables.forEach(variable => {
                                    const placeholder = `$${variable.name}`;
                                    if (field.includes(placeholder)) {
                                        field = field.replace(placeholder, variable.value);
                                    }
                                });
                            }

                            queryRef = queryRef.orderBy(field, order.direction);
                        });
                    }

                    // Function to process the template with conditional rendering
                    const processTemplate = (template, data) => {
                        // Regular expression to match conditional blocks
                        const conditionalRegex = /(if|else\s*if|else)\s*\((.*?)\)\s*\{([\s\S]*?)\}/g;
                        let result = '';
                        let lastIndex = 0;
                        let conditionMet = false;

                        let match;
                        while ((match = conditionalRegex.exec(template)) !== null) {
                            const [fullMatch, conditionType, conditionExpr, content] = match;
                            const startIndex = match.index;
                            const endIndex = conditionalRegex.lastIndex;

                            // Append any text before the conditional block
                            result += template.substring(lastIndex, startIndex);

                            if (!conditionMet || conditionType === 'else') {
                                let conditionPassed = false;
                                if (conditionType === 'else') {
                                    conditionPassed = true;
                                } else {
                                    // Replace placeholders in the condition
                                    let evaluatedCondition = conditionExpr.replace(/#(\w+)/g, (placeholder, fieldName) => {
                                        const value = data[fieldName];
                                        if (typeof value === 'string') {
                                            return `"${value}"`;
                                        } else {
                                            return value;
                                        }
                                    });

                                    // Safely evaluate the condition
                                    conditionPassed = evaluateCondition(evaluatedCondition);
                                }

                                if (conditionPassed) {
                                    // Process content within the conditional block
                                    const processedContent = content.replace(/#(\w+)/g, (placeholder, fieldName) => {
                                        return data[fieldName] !== undefined ? data[fieldName] : '';
                                    });
                                    result += processedContent;
                                    conditionMet = true;
                                }
                            }

                            lastIndex = endIndex;
                        }

                        // Append any remaining text after the last conditional block
                        result += template.substring(lastIndex);

                        // Replace any remaining placeholders
                        result = result.replace(/#(\w+)/g, (placeholder, fieldName) => {
                            return data[fieldName] !== undefined ? data[fieldName] : '';
                        });

                        return result;
                    };

                    // Function to safely evaluate a condition
                    const evaluateCondition = (condition) => {
                        try {
                            // Only allow certain operators and patterns
                            const allowedPattern = /^[\s\w"'><=!.&|()]+$/;
                            if (!allowedPattern.test(condition)) {
                                throw new Error('Invalid characters in condition.');
                            }

                            // Disallow accessing properties like constructor, prototype, etc.
                            const disallowedPattern = /(\bconstructor\b|\bprototype\b|\b__proto__\b)/;
                            if (disallowedPattern.test(condition)) {
                                throw new Error('Disallowed property access in condition.');
                            }

                            // Evaluate the condition
                            return Function('"use strict"; return (' + condition + ')')();
                        } catch (e) {
                            console.error("Error evaluating condition:", e);
                            return false;
                        }
                    };

                    // Define the function to render content
                    const renderContent = (snapshot) => {
                        containerElement.innerHTML = ''; // Clear existing content

                        snapshot.forEach(docSnapshot => {
                            const docData = docSnapshot.data();

                            // Process the template with the document data
                            const processedHTML = processTemplate(dynamicSnippetItemCode, docData);

                            // Create a temporary element to hold the processed HTML
                            const tempElement = document.createElement('div');
                            tempElement.innerHTML = processedHTML;

                            // Append the populated item to the container
                            if (tempElement.firstElementChild) {
                                containerElement.appendChild(tempElement.firstElementChild);
                            }
                        });

                        onSuccess && onSuccess(snapshot);
                    };

                    // Initialize unsubscribe function (for real-time updates)
                    let unsubscribe = null;

                    // Check if real-time updates are enabled
                    if (realTimeUpdatesOn) {
                        // Set up Firestore onSnapshot listener for real-time updates
                        unsubscribe = queryRef.onSnapshot(
                            (snapshot) => renderContent(snapshot),
                            (error) => {
                                console.error("Error fetching real-time updates:", error);
                                onFailure && onFailure("Error fetching real-time updates.");
                                resolve(null);
                            }
                        );
                    } else {
                        // Fetch data once without real-time updates
                        const snapshot = await queryRef.get();
                        renderContent(snapshot);
                    }

                    // Return an object with an unsubscribe method if real-time updates are on
                    const onSnippetObj = {
                        unsubscribe: () => {
                            if (unsubscribe) {
                                unsubscribe();
                            }
                        },
                    };
                    onSnippet && onSnippet(onSnippetObj);

                    resolve(onSnippetObj);
                } catch (error) {
                    console.error("Error fetching collection data or displaying items:", error);
                    onFailure && onFailure("Error fetching collection data or displaying items.");
                    reject(error);
                }
            }).catch(error => {
                console.error("Error fetching workspace or snippet:", error);
                onFailure && onFailure("Error fetching workspace or snippet.");
                reject(error);
            });
        });
    }

    // Helper function to parse value types
    parseValue(value) {
        // Check if value is an array
        if (Array.isArray(value)) {
            // Return a new array with each element parsed individually
            return value.map(item => this.parseSingleValue(item));
        } else {
            // Parse single value directly
            return this.parseSingleValue(value);
        }
    }

    // Helper function to parse individual values within an array or single values
    parseSingleValue(singleValue) {
        if (typeof singleValue === 'string') {
            // Attempt to parse booleans
            if (singleValue.toLowerCase() === 'true') {
                return true;
            } else if (singleValue.toLowerCase() === 'false') {
                return false;
            }

            // Attempt to parse numbers
            const numberValue = Number(singleValue);
            if (!isNaN(numberValue)) {
                return numberValue;
            }
        }
        // Return as-is if it can't be parsed
        return singleValue;
    }



}