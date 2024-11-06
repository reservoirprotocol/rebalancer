export default {
    url: "/quote/v1",
    method: "POST",
    handler: async (req: any, reply: { send: (arg0: { message: string; }) => void; }) => {
        reply.send({ message: "Hello, world!" });
    },
};
