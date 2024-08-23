export default {
    name: "Compress Image",
    apply: async (file) => {
        // Simulating image compression
        console.log("Compressing image:", file.name);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return new Blob([file], { type: file.type });
    }
};