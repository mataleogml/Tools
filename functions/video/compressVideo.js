export default {
    name: "Compress Video",
    apply: async (file) => {
        // Simulating video compression
        console.log("Compressing video:", file.name);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return new Blob([file], { type: file.type });
    }
};