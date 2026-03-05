export default async function ArtistPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <span className="block relative w-fit top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            TODO {id}
        </span>
    );
}
