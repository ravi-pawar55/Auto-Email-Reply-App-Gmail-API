//Imported packages
//googleapis: This package is imported from the googleapis module and provides the necessary functionality to interact with various Google APIs, including the Gmail API.
//auth: This is the auth.js file that we created earlier to handle the authorization process.

const { google } = require('googleapis');
const { authorize } = require('./auth');

// create set to store message email ids to avoid replying to the same message multiple times
const replied = new Set();

// Function to retrieve unread messages from the inbox
async function getUnreadEmails(gmail) {
    try {
        // Retrieving unread messages from the inbox
        const response = await gmail.users.messages.list({
            userId: "me",
            labelIds: ["INBOX"],
            q: "is:unread",
        });
        // Returning the messages
        return response.data.messages || [];
    } catch (error) {
        console.log("Error in getUnReadEmails: ", error);
    }
}

// Function to create the "AutoReplied" label if it doesn't exist
const labelName = "AutoReplied";
async function createLabel(gmail) {
    try {
        // Creating the "AutoReplied" label
        const response = await gmail.users.labels.create({
            userId: "me",
            requestBody: {
                name: labelName,
                labelListVisibility: "labelShow",
                messageListVisibility: "show",
            },
        });
        // Returning the label id
        return response.data.id;
    } catch (error) {
        // If the label already exists, retrieve its id
        // error.code === 409 means that the label already exists
        if (error.code === 409) {
            const response = await gmail.users.labels.list({
                userId: "me",
            });
            // Returning the label id
            const label = response.data.labels.find(
                (label) => label.name === labelName
            );
            return label.id;
        } else {
            throw error;
        }
    }
}

// Function to get random time between 45 to 120 seconds to run the auto reply in every interval
const getRandomTime = () => {
    return Math.floor(Math.random() * (120000 - 45000 + 1) + 45000);
}

// Function to run the auto email reply 
const autoReply = async (gmail, labelId) => {
    console.log("==================================================================");
    // Retrieving unread messages from fuction getUnreadEmails
    const messages = await getUnreadEmails(gmail);

    // If no unread messages found, return
    if (messages.length === 0) {
        console.log("No unread messages found");
        return;
    } else {
        console.log(`Found ${messages.length} unread messages`);
        // Looping through the unread messages
        for (const message of messages) {
            const messageResponse = await gmail.users.messages.get({
                userId: "me",
                id: message.id,
            });
            // Retrieving the sender's name, email, subject and message thread id
            const headers = messageResponse.data.payload.headers;

            const senderEmail = headers.find(
                (header) => header.name === "From"
            ).value;
            const senderName = senderEmail.split(" ")[0] || "";
            const subject = headers.find(
                (header) => header.name === "Subject"
            ).value;

            // If the message has already been replied to, skip it
            const messageThread = messageResponse.data.threadId;
            if (replied.has(senderEmail)) {
                console.log(`Already replied to ${senderName}`);
                continue;
            }
            console.log(`Found message with subject "${subject}" from "${senderName}"`);

            try {
                // Creating the auto reply message
                const replyTo = senderEmail.match(/<(.*)>/)[1];
                const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
                const replyMessageBody = `Hi ${senderName},\n\nThanks for your message. I'm currently on a vacation and will respond to your message as soon as possible.\n\nBest Regards,\nRavi Pawar`;
                const rawMessage = [
                    `From: me`,
                    `To: ${replyTo}`,
                    `Subject: ${replySubject}`,
                    `In-Reply-To: ${message.id}`,
                    `References: ${messageThread}`,
                    ``,
                    replyMessageBody,
                ].join("\n");
                // Encoding the message to base64url format
                const encodedMessage = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '-').replace(/=+$/, '');

                // send auto reply
                const response = await gmail.users.messages.send({
                    userId: 'me',
                    requestBody: {
                        raw: encodedMessage,
                    },
                });

                // Modify labels of the original message
                await gmail.users.messages.modify({
                    userId: "me",
                    id: message.id,
                    requestBody: {
                        removeLabelIds: ["UNREAD", "INBOX"],
                        addLabelIds: [labelId],
                    },
                });

                // adding message email id to repliedset
                replied.add(senderEmail);
                console.log(`Replied to message with subject "Re: ${subject}" from "${senderEmail}"`);
                console.log("==================================================================");
            } catch (error) {
                console.log(error);
            }
        }
    }
}

// Main function to run the auto reply 
async function main(auth) {
    // Create a new Gmail instance with the auth client and setting the default parameters
    const gmail = google.gmail({
        version: "v1",
        auth
    });

    // Create the "AutoReplied" label if it doesn't exist and retrieve its id
    const labelId = await createLabel(gmail);

    // Ensure the "AutoReplied" label is created successfully
    if (!labelId) {
        console.error("Failed to create or retrieve 'AutoReplied' label.");
        return;
    }

    // Calling autoReply function to run the auto reply to the unread emails
    await autoReply(gmail, labelId);

    //Setting Interval and calling main function in every interval of 45 to 120 seconds
    setInterval(async () => {
        await autoReply(gmail, labelId);
    }, getRandomTime());
}

// Calling authorize function to get the credentials and then calling main function to run the auto reply 
authorize().then(main).catch(console.error);

/* 
    Future Improvements:
    1. Add more labels to the messages to make the auto reply more efficient
    2. Add more conditions to the auto reply message to make it more efficient
    3. secure the credentials.json file
    4. Add more error handling
    5.The code could be optimized to handle larger volumes of emails more efficiently.
    6.Making the code more flexible by allowing users to provide their own configuration options, such as email filters or customized reply messages.
    7. Any other good improvement that you can think of
  These are some areas where the app can be improved.
  */