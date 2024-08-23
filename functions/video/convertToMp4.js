export default {
    name: "Convert to MP4",
    apply: async (file) => {
        // Simulating conversion to MP4
        console.log("Converting video to MP4:", file.name);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return new Blob([file], { type: 'video/mp4' });
    }
};