import { Server } from "socket.io";

let io;

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });
};

export function getIO() {
    if (!io) {
        throw new Error("Socket not initialized");
    }
    return io;
}