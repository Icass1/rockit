export default async function ArtistPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <span className="relative top-1/2 left-1/2 block w-fit -translate-x-1/2 -translate-y-1/2">
            TODO {id}
        </span>
    );
}
