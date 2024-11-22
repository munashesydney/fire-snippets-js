class FireSnippets {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.db = null;
        this.workspaceConfig = null;
        this.workspaceId = null;
        this.userId = null;

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

    async incrementField(field) {
        if (!this.db) {
            console.error("Firestore database not initialized.");
            return;
        }

        if (!this.workspacePath) {
            console.error("Workspace path not defined.");
            return;
        }

        if (!field || typeof field !== 'string') {
            console.error("Invalid field provided.");
            return;
        }

        try {
            // Increment the field atomically
            await this.db.doc(this.workspacePath).update({
                [field]: firebase.firestore.FieldValue.increment(1),
            });
            console.log(`Successfully incremented field: ${field}`);
        } catch (error) {
            console.error("Error incrementing field:", error);
        }
    }

    async incrementFieldSnippetCall(field, snippetId) {
        if (!this.db) {
            console.error("Firestore database not initialized.");
            return;
        }

        if (!this.workspacePath) {
            console.error("Workspace path not defined.");
            return;
        }

        if (!field || typeof field !== 'string') {
            console.error("Invalid field provided.");
            return;
        }

        try {
            const snippetDocRef = this.db.doc(`${this.workspacePath}/snippets/${snippetId}`);

            // Use a Firestore transaction to handle field incrementing or initialization
            await this.db.runTransaction(async (transaction) => {
                const snippetDoc = await transaction.get(snippetDocRef);

                if (!snippetDoc.exists) {
                    console.error(`Snippet with ID ${snippetId} does not exist.`);
                    return;
                }

                const snippetData = snippetDoc.data() || {};

                // If the field doesn't exist, initialize it to 1
                if (!(field in snippetData)) {
                    transaction.set(snippetDocRef, { [field]: 1 }, { merge: true });
                } else {
                    // Increment the existing field
                    transaction.update(snippetDocRef, {
                        [field]: firebase.firestore.FieldValue.increment(1),
                    });
                }
            });

            console.log(`Successfully incremented snippet call for ${snippetId}`);
        } catch (error) {
            console.error("Error incrementing field:", error);
        }
    }




    // Function to find workspace by apiKey
    async findWorkspaceByApiKey() {
        if (!this.db) {
            console.error("Firestore database not initialized.");
            return;
        }

        // Query to find the workspace with the specified apiKey or apiKeyLive
        const apiKeyQuery = this.db.collectionGroup("workspaces")
            .where("apiKey", "==", this.apiKey)
            .limit(1)
            .get();

        const apiKeyLiveQuery = this.db.collectionGroup("workspaces")
            .where("liveApiKey", "==", this.apiKey)
            .limit(1)
            .get();

        const [apiKeySnapshot, apiKeyLiveSnapshot] = await Promise.all([apiKeyQuery, apiKeyLiveQuery]);
        if (apiKeySnapshot.empty && apiKeyLiveSnapshot.empty) {
            console.error("No workspace found with the specified apiKey or apiKeyLive.");
            return;
        }

        let workspaceDoc = null;
        if (!apiKeySnapshot.empty) {
            workspaceDoc = apiKeySnapshot.docs[0];
        } else if (!apiKeyLiveSnapshot.empty) {
            workspaceDoc = apiKeyLiveSnapshot.docs[0];
        }

        this.workspaceId = workspaceDoc.id;
        this.workspaceConfig = workspaceDoc.data().firebaseConfig;
        this.sAcc = workspaceDoc.data().sAcc || null;
        this.sAccLive = workspaceDoc.data().sAccLive || null;
        this.workspacePath = workspaceDoc.ref.path;

        const pathSegments = workspaceDoc.ref.path.split("/");
        const userId = pathSegments[1];
        this.userId = userId;

        console.log("Workspace found and configured.");
    }

    // Function to find snippet by snippetId
    async findSnippetById(snippetId) {
        if (this.workspaceConfig == null) {
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

    
    // Function to handle login using snippetId
    login(snippetId) {
        return new Promise((resolve, reject) => {
            this.findSnippetById(snippetId)
                .then(async ({ foundWorkspaceConfig, snippetData }) => {
                    if (!foundWorkspaceConfig || !snippetData) {
                        console.error("No workspace or snippet found with the provided apiKey and snippetId.");
                        return reject(new Error("No workspace or snippet found with the provided apiKey and snippetId."));
                    }

                    const { emailElementId, passwordElementId, buttonElementId } = snippetData;

                    // Retrieve elements based on the fields from snippetData
                    const emailElem = document.getElementById(emailElementId);
                    const passwordElem = document.getElementById(passwordElementId);
                    const submitButton = document.getElementById(buttonElementId);

                    if (!emailElem || !passwordElem || !submitButton) {
                        console.error("One or more elements specified in the snippet not found.");
                        return reject(new Error("One or more elements specified in the snippet not found."));
                    }

                    // Attach an onclick listener to the submit button
                    submitButton.onclick = async () => {
                        const emailValue = emailElem.value;
                        const passwordValue = passwordElem.value;

                        if (!emailValue || !passwordValue) {
                            console.error("Email or password is empty.");
                            return reject(new Error("Email or password is empty."));
                        }

                        submitButton.innerHTML = "Signing In...";
                        submitButton.disabled = true;

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

                            await this.incrementField('currentAuth');
                            await this.incrementFieldSnippetCall('calls', snippetId);

                            submitButton.innerHTML = "You're Done!";
                            submitButton.disabled = true;
                            resolve(userCredential);
                        } catch (error) {
                            console.error("Error logging in:", error.code, error.message);
                            submitButton.innerHTML = "Try Again";
                            submitButton.disabled = false;
                            reject(error);
                        }
                    };
                })
                .catch(error => {
                    console.error("Error fetching workspace or snippet:", error);
                    reject(error);
                });
        });
    }
    

    getCurrentUser() {
        return new Promise( async (resolve, reject) => {
            if (this.workspaceConfig == null) {
                await this.findWorkspaceByApiKey();
            }

            // Initialize user's Firebase app
            const userAppName = "UserApp";
            let userApp;
            if (!firebase.apps.some(app => app.name === userAppName)) {
                userApp = firebase.initializeApp(this.workspaceConfig, userAppName);
            } else {
                userApp = firebase.app(userAppName);
            }

            const userAuth = firebase.auth(userApp);

            userAuth.onAuthStateChanged((user) => {
                if (user) {
                  resolve(user);
                } else {
                  resolve(null);
                }
              });

        });
    }

    signUp(snippetId) {
        return new Promise((resolve, reject) => {
            this.findSnippetById(snippetId)
                .then(async ({ foundWorkspaceConfig, snippetData }) => {
                    if (!foundWorkspaceConfig || !snippetData) {
                        console.error("No workspace or snippet found with the provided apiKey and snippetId.");
                        return reject(new Error("No workspace or snippet found with the provided apiKey and snippetId."));
                    }

                    const { emailElementId, passwordElementId, buttonElementId, fieldMappings, usersCollectionName } = snippetData;

                    // Retrieve elements based on the fields from snippetData
                    const emailElem = document.getElementById(emailElementId);
                    const passwordElem = document.getElementById(passwordElementId);
                    const submitButton = document.getElementById(buttonElementId);

                    if (!emailElem || !passwordElem || !submitButton) {
                        console.error("One or more elements specified in the snippet not found.");
                        return reject(new Error("One or more elements specified in the snippet not found."));
                    }

                    // Attach an onclick listener to the submit button
                    submitButton.onclick = async () => {
                        const emailValue = emailElem.value;
                        const passwordValue = passwordElem.value;

                        if (!emailValue || !passwordValue) {
                            console.error("Email or password is empty.");
                            return reject(new Error("Email or password is empty."));
                        }

                        submitButton.innerHTML = "Signing In...";
                        submitButton.disabled = true;

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
                            const userData = { email: emailValue };

                            // Retrieve additional field values from fieldMappings
                            if (Array.isArray(fieldMappings)) {
                                fieldMappings.forEach(mapping => {
                                    const { field, elementId } = mapping;
                                    const element = document.getElementById(elementId);
                                    if (element) {
                                        userData[field] = element.value;
                                    }
                                });
                            }

                            // Save user data to Firestore in TheUsers collection
                            const firestore = firebase.firestore(userApp);
                            await firestore.collection(usersCollectionName).doc(userCredential.user.uid).set(userData);


                            try {
                                // Prepare the data for the payment link
                                const paymentData = {
                                    sAcc: this.sAcc, // Connected Stripe account ID
                                    sAccLive: this.sAccLive,
                                    apiKey: this.apiKey,
                                    snippetId: snippetId,
                                    workspaceId: this.workspaceId,
                                    userId: this.userId,
                                    email: emailValue,
                                    metadata: {}
                                };

                                // Add variables to metadata
                                /*if (Array.isArray(variables)) {
                                    variables.forEach(variable => {
                                        paymentData.metadata[variable.name] = variable.value;
                                    });
                                }*/

                                paymentData.metadata["email"] = emailValue;

                                if (Array.isArray(fieldMappings)) {
                                    fieldMappings.forEach(mapping => {
                                        const { field, elementId } = mapping;
                                        const element = document.getElementById(elementId);
                                        if (element) {
                                            paymentData.metadata[field] = element.value;
                                        }
                                    });
                                }

                                // Call the backend endpoint to create the payment link
                                const response = await fetch('https://server.firesnippets.com/snippet-email', {
                                    //const response = await fetch('http://localhost:3002/snippet-email', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(paymentData)
                                });

                                if (!response.ok) {
                                    const errorText = await response.text();
                                    console.error("Error sending email after signup:", errorText);
                                    //return reject(new Error("Error creating payment link."));
                                }
                            } catch (error) {
                                console.error("Error sending email after signup:", error);
                                //reject(error);
                            }

                            await this.incrementField('currentAuth');
                            await this.incrementFieldSnippetCall('calls', snippetId);

                            submitButton.innerHTML = "You're Done!";
                            submitButton.disabled = false;

                            resolve(userCredential);
                        } catch (error) {
                            console.error("Error signing up:", error.code, error.message);
                            submitButton.innerHTML = "Try again";
                            submitButton.disabled = false;
                            reject(error);
                        }
                    };
                })
                .catch(error => {
                    console.error("Error fetching workspace or snippet:", error);
                    reject(error);
                });
        });
    }
    

    add(snippetId, variables) {
        return new Promise((resolve, reject) => {
            this.findSnippetById(snippetId)
                .then(async ({ foundWorkspaceConfig, snippetData }) => {
                    if (!foundWorkspaceConfig || !snippetData) {
                        console.error("No workspace or snippet found with the provided apiKey and snippetId.");
                        return reject(new Error("No workspace or snippet found with the provided apiKey and snippetId."));
                    }
    
                    const { pathSegments, fieldMappings, buttonElementId } = snippetData;
    
                    if (!Array.isArray(pathSegments) || !Array.isArray(fieldMappings) || !buttonElementId) {
                        console.error("Invalid pathSegments, fieldMappings, or buttonElementId in snippetData.");
                        return reject(new Error("Invalid snippet configuration."));
                    }
    
                    // Retrieve the button element
                    const submitButton = document.getElementById(buttonElementId);
                    if (!submitButton) {
                        console.error(`Button element with id "${buttonElementId}" not found.`);
                        return reject(new Error(`Button element with id "${buttonElementId}" not found.`));
                    }
    
                    // Attach an onclick listener to the submit button
                    submitButton.onclick = async () => {
                        try {
                            // Collect data from the elements specified in fieldMappings
                            const data = {};
    
                            for (let mapping of fieldMappings) {
                                const { field, elementId } = mapping;
                                const element = document.getElementById(elementId);
                                if (element) {
                                    data[field] = element.value;
                                } else {
                                    console.error(`Element with id "${elementId}" not found.`);
                                    return reject(new Error(`Element with id "${elementId}" not found.`));
                                }
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
    
                            // Construct the Firestore path from resolvedPathSegments
                            let firestorePath = '';
                            resolvedPathSegments.forEach((segment, index) => {
                                firestorePath += `${segment.value}${index < resolvedPathSegments.length - 1 ? '/' : ''}`;
                            });
    
                            // Initialize user's Firebase app
                            const userAppName = "UserApp";
                            let userApp;
                            if (!firebase.apps.some(app => app.name === userAppName)) {
                                userApp = firebase.initializeApp(foundWorkspaceConfig, userAppName);
                            } else {
                                userApp = firebase.app(userAppName);
                            }
    
                            // Retrieve Firestore instance for user app
                            const firestore = firebase.firestore(userApp);
    
                            // Add new document to the specified collection
                            const theDoc = await firestore.collection(firestorePath).add(data);
    
                            console.log("Document added successfully.");
                            await this.incrementField('currentWrites');
                            await this.incrementFieldSnippetCall('calls', snippetId);
    
                            resolve(theDoc);
                        } catch (error) {
                            console.error("Error adding document:", error);
                            reject(error);
                        }
                    };
                })
                .catch(error => {
                    console.error("Error fetching workspace or snippet:", error);
                    reject(error);
                });
        });
    }
    

    payment(snippetId, variables, withButton = false) {
        return new Promise((resolve, reject) => {
            this.findSnippetById(snippetId)
                .then(async ({ foundWorkspaceConfig, snippetData }) => {
                    if (!foundWorkspaceConfig || !snippetData) {
                        console.error("No workspace or snippet found with the provided apiKey and snippetId.");
                        return reject(new Error("No workspace or snippet found with the provided apiKey and snippetId."));
                    }

                    const { buttonElementId, priceID, paymentType, successUrl } = snippetData;

                    if (!priceID) {
                        console.error("Invalid priceID in snippetData.");
                        return reject(new Error("Invalid snippet configuration."));
                    }

                    // If withButton is true, ensure the button exists and set up the click listener
                    if (withButton) {
                        if (!buttonElementId) {
                            console.error("buttonElementId is required when withButton is true.");
                            return reject(new Error("Invalid snippet configuration."));
                        }

                        const submitButton = document.getElementById(buttonElementId);
                        if (!submitButton) {
                            console.error(`Button element with id "${buttonElementId}" not found.`);
                            return reject(new Error(`Button element with id "${buttonElementId}" not found.`));
                        }

                        // Attach an onclick listener to the submit button
                        submitButton.onclick = async () => {
                            submitButton.innerHTML = "Loading payment..";
                            submitButton.disabled = true;
                            try {
                                const paymentLink = await this.processPayment(snippetId, variables, priceID, paymentType, successUrl);
                                window.location.href = paymentLink; // Redirect to the payment link
                            } catch (error) {
                                console.error("Error processing payment:", error);
                                submitButton.innerHTML = "Try payment again";
                                submitButton.disabled = false;
                                reject(error);
                            }
                        };
                    } else {
                        // If withButton is false, process the payment immediately
                        try {
                            const paymentLink = await this.processPayment(snippetId, variables, priceID, paymentType, successUrl);
                            resolve(paymentLink);
                            window.location.href = paymentLink; // Redirect to the payment link
                        } catch (error) {
                            console.error("Error processing payment:", error);
                            reject(error);
                        }
                    }
                })
                .catch(error => {
                    console.error("Error fetching workspace or snippet:", error);
                    reject(error);
                });
        });
    }

    async processPayment(snippetId, variables, priceID, paymentType, successUrl) {
        // Prepare the data for the payment link
        const paymentData = {
            priceId: priceID,
            sAcc: this.sAcc, // Connected Stripe account ID
            sAccLive: this.sAccLive,
            paymentType: paymentType,
            apiKey: this.apiKey,
            successUrl: successUrl,
            metadata: {}
        };

        // Add variables to metadata
        if (Array.isArray(variables)) {
            variables.forEach(variable => {
                paymentData.metadata[variable.name] = variable.value;
            });
        }

        paymentData.metadata['snippetId'] = snippetId;
        paymentData.metadata['workspaceId'] = this.workspaceId;
        paymentData.metadata['userId'] = this.userId;

        // Call the backend endpoint to create the payment link
        const response = await fetch('https://server.firesnippets.com/create-payment-link', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error creating payment link:", errorText);
            throw new Error("Error creating payment link.");
        }

        const result = await response.json();
        const paymentLink = result.paymentLink;

        if (!paymentLink) {
            console.error("Payment link not received from server.");
            throw new Error("Payment link not received from server.");
        }

        await this.incrementFieldSnippetCall('calls', snippetId);

        return paymentLink;
    }
    

    staticDisplay(snippetId, variables) {
        return new Promise((resolve, reject) => {
            this.findSnippetById(snippetId)
                .then(async ({ foundWorkspaceConfig, snippetData }) => {
                    if (!foundWorkspaceConfig || !snippetData) {
                        console.error("No workspace or snippet found with the provided apiKey and snippetId.");
                        return reject(new Error("No workspace or snippet found with the provided apiKey and snippetId."));
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
                        return reject(new Error("Invalid pathSegments or fieldMappings in snippetData."));
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
                        let firestorePath = '';
                        resolvedPathSegments.forEach((segment, index) => {
                            firestorePath += `${segment.value}${index < resolvedPathSegments.length - 1 ? '/' : ''}`;
                        });
    
                        // Get the last segment type to determine if we're dealing with a collection or document
                        const lastSegment = resolvedPathSegments[resolvedPathSegments.length - 1];
    
                        // Initialize unsubscribe function (for real-time updates)
                        let unsubscribe = null;
    
                        // Function to process and display the document data
                        const processDocuments = async (snapshot) => {
                            if (snapshot.empty) {
                                console.error("No documents found at the specified path with the given filters.");
                                return reject(new Error("No documents found at the specified path with the given filters."));
                            }
                
                            const data = snapshot.docs.map(doc => doc.data());
                
                            // Update DOM elements
                            snapshot.forEach(docSnapshot => {
                                const docData = docSnapshot.data();
                                fieldMappings.forEach(mapping => {
                                    const { field, elementId } = mapping;
                                    const element = document.getElementById(elementId);
                                    if (element && docData.hasOwnProperty(field)) {
                                        element.textContent = docData[field];
                                    }
                                });
                            });
                
                            await this.incrementField('currentReads');
                            await this.incrementFieldSnippetCall('calls', snippetId);
                
                            // Call onUpdate callback with data
                            onUpdate && onUpdate(data);
                        };
    
                        // Function to process a single document
                        const processDocument = async (docSnapshot) => {
                            if (!docSnapshot.exists) {
                                console.error("Document not found at the specified path.");
                                return reject(new Error("Document not found at the specified path."));
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
    
                            await this.incrementField('currentReads');
                            await this.incrementFieldSnippetCall('calls', snippetId);
    
                            // Resolve the Promise with the data
                            resolve({
                                data: docData,
                                unsubscribe: unsubscribe || (() => {})
                            });
                        };
    
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
                                    return reject(new Error("Firestore does not support 'OR' queries directly. Please revise your query conditions."));
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
                                            return reject(new Error(`Variable ${value} not provided.`));
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
    
                            // Check if real-time updates are enabled
                            if (realTimeUpdatesOn) {
                                // Set up Firestore onSnapshot listener for real-time updates
                                unsubscribe = docRef.onSnapshot(
                                    (docSnapshot) => processDocument(docSnapshot),
                                    (error) => {
                                        console.error("Error fetching real-time updates:", error);
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
                            return reject(new Error("Invalid path ending. Path must end with a collection or document."));
                        }
    
                    } catch (error) {
                        console.error("Error fetching data or displaying content:", error);
                        reject(error);
                    }
                })
                .catch(error => {
                    console.error("Error fetching workspace or snippet:", error);
                    reject(error);
                });
        });
    }
    

    dynamicDisplay(snippetId, variables, onUpdate) {
        return new Promise((resolve, reject) => {
            this.findSnippetById(snippetId)
                .then(async ({ foundWorkspaceConfig, snippetData }) => {
                    if (!foundWorkspaceConfig || !snippetData) {
                        console.error("No workspace or snippet found with the provided apiKey and snippetId.");
                        return reject(new Error("No workspace or snippet found with the provided apiKey and snippetId."));
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
                        return reject(new Error("Invalid snippet configuration."));
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
    
                        // Get the container element where items will be appended
                        const containerElement = document.getElementById(containerElementId);
                        if (!containerElement) {
                            console.error("Container element not found.");
                            return reject(new Error("Container element not found."));
                        }
    
                        // Clear any existing content in the container
                        containerElement.innerHTML = '';
    
                        // Build the Firestore query
                        let queryRef = firestore.collection(firestorePath);
    
                        // Handle queryConditions
                        if (Array.isArray(queryConditions) && queryConditions.length > 0) {
                            // Firestore does not support 'OR' queries directly
                            const hasOrCondition = queryConditions.some(cond => cond.logicalOperator === 'OR');
                            if (hasOrCondition) {
                                console.error("Firestore does not support 'OR' queries in this manner.");
                                return reject(new Error("Firestore does not support 'OR' queries directly. Please revise your query conditions."));
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
                                        return reject(new Error(`Variable ${value} not provided.`));
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
                        const renderContent = async (snapshot) => {
                            containerElement.innerHTML = ''; // Clear existing content
    
                            const dataArray = [];
    
                            snapshot.forEach(docSnapshot => {
                                const docData = docSnapshot.data();
                                dataArray.push(docData);
    
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
    
                            await this.incrementField('currentReads');
                            await this.incrementFieldSnippetCall('calls', snippetId);
    
                            // Call onUpdate callback with the data array
                            onUpdate && onUpdate(dataArray);
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
                                    reject(error);
                                }
                            );
                        } else {
                            // Fetch data once without real-time updates
                            const snapshot = await queryRef.get();
                            await renderContent(snapshot);
                        }
    
                        // Return an object with an unsubscribe method
                        resolve({
                            unsubscribe: () => {
                                if (unsubscribe) {
                                    unsubscribe();
                                }
                            },
                        });
                    } catch (error) {
                        console.error("Error fetching collection data or displaying items:", error);
                        reject(error);
                    }
                })
                .catch(error => {
                    console.error("Error fetching workspace or snippet:", error);
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