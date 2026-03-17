import YoutubeVideoClient from "@/components/Youtube/Video";

export default async function Page({
    params,
}: {
    params: Promise<{ youtubeId: string }>;
}) {
    const { youtubeId } = await params;

    console.log(youtubeId);

    return <YoutubeVideoClient youtubeId={youtubeId} />;
}
