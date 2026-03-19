const { io } = require("socket.io-client");

const SERVER_URL = "http://localhost:5000";

async function testMatch(interests1, interests2, label) {
    console.log(`\n--- Testing: ${label} ---`);
    const socket1 = io(SERVER_URL);
    const socket2 = io(SERVER_URL);

    return new Promise((resolve) => {
        let match1 = null;
        let match2 = null;

        const checkDone = () => {
            if (match1 && match2) {
                console.log(`Result: Matched!`);
                console.log(`User 1 Common: ${JSON.stringify(match1.commonInterests)}, Stranger: ${JSON.stringify(match1.strangerInterests)}`);
                console.log(`User 2 Common: ${JSON.stringify(match2.commonInterests)}, Stranger: ${JSON.stringify(match2.strangerInterests)}`);
                socket1.disconnect();
                socket2.disconnect();
                resolve();
            }
        };

        socket1.on("connect", () => {
            console.log("User 1 connected");
            socket1.emit("join_queue", { type: "text", interests: interests1 });
        });

        socket2.on("connect", () => {
            console.log("User 2 connected");
            socket2.emit("join_queue", { type: "text", interests: interests2 });
        });

        socket1.on("match_found", (data) => {
            match1 = data;
            checkDone();
        });

        socket2.on("match_found", (data) => {
            match2 = data;
            checkDone();
        });

        setTimeout(() => {
            if (!match1 || !match2) {
                console.log(`Result: No match found after 5s`);
                socket1.disconnect();
                socket2.disconnect();
                resolve();
            }
        }, 5000);
    });
}

async function runTests() {
    await testMatch(["music"], ["music"], "Shared Interests (music & music)");
    await testMatch(["music"], [], "Open Match (music & none)");
    await testMatch(["music"], ["gaming"], "Isolated Match (music & gaming)");
    await testMatch([], [], "Both Open (none & none)");
    process.exit(0);
}

runTests();
