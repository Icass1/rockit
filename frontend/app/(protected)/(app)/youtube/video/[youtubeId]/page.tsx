import YoutubeVideoClient from "@/components/Youtube/Video";

export default function Page({ params }: { params: { youtubeId: string } }) {
    return <YoutubeVideoClient youtubeId={params.youtubeId} />;
}
