import TestVideoClient from "@/components/TestVideo/TestVideoClient";

export default async function TestVideoPage({
    params,
}: {
    params: Promise<{ youtube_video_id: string }>;
}) {
    const { youtube_video_id } = await params;
    return <TestVideoClient youtubeVideoId={youtube_video_id} />;
}
