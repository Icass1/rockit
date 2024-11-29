import { useEffect, useRef, useState, type UIEvent } from "react";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";

interface Album {
    id: number;
    title: string;
    artist: string;
    image: string;
}

const images = [
    "https://i.scdn.co/image/ab67616d0000b273f82d2bd1097e3e60a6a049a3",
    "https://i.scdn.co/image/ab67616d0000b2735405ef9e393f5f1e53b4b42e",
    "https://i.scdn.co/image/ab67616d0000b27389d7032603b62e9aedb03fa2",
    "https://i.scdn.co/image/ab67616d0000b273816e8b3e3e4b8fd048e8c55d",
    "https://i.scdn.co/image/ab67616d0000b273bddcc30c6a3288e725aec2df",
    "https://i.scdn.co/image/ab67616d0000b273093c6e7d6069b3c958071f73",
    "https://i.scdn.co/image/ab67616d0000b273a95d2ea6952dd4ff391d8f73",
    "https://i.scdn.co/image/ab67616d0000b2736c07aa29a541c11d913ba3e8",
    "https://i.scdn.co/image/ab67616d0000b273bf54521d83215d69b57f614b",
    "https://i.scdn.co/image/ab67616d0000b273b2fb4238eaa37aad5e01ada1",
    "https://i.scdn.co/image/ab67616d0000b273c1cea74444e62c9af3c5bd4d",
    "https://i.scdn.co/image/ab67616d0000b27372513233916c9ec4c819c3f0",
    "https://i.scdn.co/image/ab67616d0000b2736c747bfd0a5c8d56e3cbc085",
    "https://i.scdn.co/image/ab67616d0000b273f7642d9a8207443acf9b5466",
    "https://i.scdn.co/image/ab67616d0000b2733a973ec9729173683bf5c266",
    "https://i.scdn.co/image/ab67616d0000b273a7865e686c36a4adda6c9978",
    "https://i.scdn.co/image/ab67616d0000b2736affdd29d6ee84a298746ef7",
    "https://i.scdn.co/image/ab67616d0000b273fabcc97fd6c3d80fae8d959e",
    "https://i.scdn.co/image/ab67616d0000b273226c848268e693f3812e7e69",
    "https://i.scdn.co/image/ab67616d0000b273514733d692bf5cfa906cbf87",
    "https://i.scdn.co/image/ab67616d0000b273e8dd4db47e7177c63b0b7d53",
    "https://i.scdn.co/image/ab67616d0000b273e0f0aa947770fe74049dbba3",
    "https://i.scdn.co/image/ab67616d0000b27322463d6939fec9e17b2a6235",
    "https://i.scdn.co/image/ab67616d0000b2731336b31b6a1799f0de5807ac",
    "https://i.scdn.co/image/ab67616d0000b2738cefe8e2f2cfd63ce073fa96",
    "https://i.scdn.co/image/ab67616d0000b273b9c4979446c4d39bc08e9503",
    "https://i.scdn.co/image/ab67616d0000b2734a052b99c042dc15f933145b",
    "https://i.scdn.co/image/ab67616d0000b273de437d960dda1ac0a3586d97",
    "https://i.scdn.co/image/ab67616d0000b273b3994c94dfb241923664bb4d",
    "https://i.scdn.co/image/ab67616d0000b273ada101c2e9e97feb8fae37a9",
    "https://i.scdn.co/image/ab67616d0000b273de3094d98b62340d3268c7bc",
    "https://i.scdn.co/image/ab67616d0000b2730b51f8d91f3a21e8426361ae",
    "https://i.scdn.co/image/ab67616d0000b2733e030a7e606959674643d274",
    "https://i.scdn.co/image/ab67616d0000b273814cbc4746358a25c84c62e7",
    "https://i.scdn.co/image/ab67616d0000b273cfe4163cbb6d12f3ec15898e",
    "https://i.scdn.co/image/ab67616d0000b273cc57e9b00b87dd0f6e868347",
    "https://i.scdn.co/image/ab67616d0000b2731336b31b6a1799f0de5807ac",
    "https://i.scdn.co/image/ab67616d0000b273056e90910cbaf5c5b892aeba",
    "https://i.scdn.co/image/ab67616d0000b27325a4df452a3c42ccc2e9288b",
    "https://i.scdn.co/image/ab67616d0000b27349c982dae436bac27c336f45",
    "https://i.scdn.co/image/ab67616d0000b273fe1a9aa59e3c6189a09ae37a",
    "https://i.scdn.co/image/ab67616d0000b273cf1fee2a55e98e22bf358512",
    "https://i.scdn.co/image/ab67616d0000b273a7865e686c36a4adda6c9978",
    "https://i.scdn.co/image/ab67616d0000b2731c40418d1c37d727e8e91b04",
    "https://i.scdn.co/image/ab67616d0000b2735e25e034e25258b356774c79",
    "https://i.scdn.co/image/ab67616d0000b273d254ca497999ae980a5a38c5",
    "https://i.scdn.co/image/ab67616d0000b273aedd9728f5cc4b13ee49e061",
    "https://i.scdn.co/image/ab67616d0000b2737027294551db4fda68b5ddac",
    "https://i.scdn.co/image/ab67616d0000b273060ccf36ab5b0e0a739799ec",
    "https://i.scdn.co/image/ab67616d0000b27390b8a540137ee2a718a369f9",
    "https://i.scdn.co/image/ab67616d0000b2738ccc17f29764d812062204a8",
    "https://i.scdn.co/image/ab67616d0000b273b7bea3d01f04e6d0408d2afe",
    "https://i.scdn.co/image/ab67616d0000b273aa5e4c9da271951ac0b31fa2",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b273fb2daafa0993f39d87a84385",
    "https://i.scdn.co/image/ab67616d0000b2733c73b2e0a6aa490736f19751",
    "https://i.scdn.co/image/ab67616d0000b273cf1fee2a55e98e22bf358512",
    "https://i.scdn.co/image/ab67616d0000b273eafaf556eda644a745d0144d",
    "https://i.scdn.co/image/ab67616d0000b27308fc42e575043a753f60d675",
    "https://i.scdn.co/image/ab67616d0000b273fb2faa3ed46d1d0124ca325e",
    "https://i.scdn.co/image/ab67616d0000b2735579d8a505c727349a203074",
    "https://i.scdn.co/image/ab67616d0000b273b414c63fb435b622238c15ed",
    "https://i.scdn.co/image/ab67616d0000b2732ff76b4da68f018b4735ee59",
    "https://i.scdn.co/image/ab67616d0000b273668e3aca3167e6e569a9aa20",
    "https://i.scdn.co/image/ab67616d0000b273f6954c1f074f66907a8c5483",
    "https://i.scdn.co/image/ab67616d0000b273b30c8b93cef6fa26f8a7f17a",
    "https://i.scdn.co/image/ab67616d0000b2734650ca0a8f88129d4667acc5",
    "https://i.scdn.co/image/ab67616d0000b273f5e30500f0eec7d92b159eae",
    "https://i.scdn.co/image/ab67616d0000b273edc27582d8f5c3a7c56893bf",
    "https://i.scdn.co/image/ab67616d0000b273ab0a92e5cd20c2224c44a8a6",
    "https://i.scdn.co/image/ab67616d0000b273bd0c47e4cfb4ee327e53bc73",
    "https://i.scdn.co/image/ab67616d0000b27388ffe8c41647856e6fa5e1ab",
    "https://i.scdn.co/image/ab67616d0000b2736731eabe4c268971eeed3c06",
    "https://i.scdn.co/image/ab67616d0000b273f4a2ccbe20d6d52f16816812",
    "https://i.scdn.co/image/ab67616d0000b273f97219e49a23bfdd4de7eed1",
    "https://i.scdn.co/image/ab67616d0000b2731946747b8692919f98918ec4",
    "https://i.scdn.co/image/ab67616d0000b273e59d7ff5a9d7634c02135b19",
    "https://i.scdn.co/image/ab67616d0000b273813da91820fd194cbee5bdce",
    "https://i.scdn.co/image/ab67616d0000b273be1421122cef4940f500ac06",
    "https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be",
    "https://i.scdn.co/image/ab67616d0000b273b7879980ef2ea7ac1cc29316",
    "https://i.scdn.co/image/ab67616d0000b2735306ed42ae78f317258c51bb",
    "https://i.scdn.co/image/ab67616d0000b27336572e6726714544f5bed456",
    "https://i.scdn.co/image/ab67616d0000b273192f3a588427f2cbf8365506",
    "https://i.scdn.co/image/ab67616d0000b27346e859872ed30a898160aeb2",
    "https://i.scdn.co/image/ab67616d0000b273aaba065944cd82a6f15c86b6",
    "https://i.scdn.co/image/ab67616d0000b2737027294551db4fda68b5ddac",
    "https://i.scdn.co/image/ab67616d0000b2731310670cbb82f06474372cfd",
    "https://i.scdn.co/image/ab67616d0000b27323cc0f0a925845a3de4aca38",
    "https://i.scdn.co/image/ab67616d0000b27309467e05060a265e54c5b2b3",
    "https://i.scdn.co/image/ab67616d0000b27322f1b1c3e396b003b7bdd637",
    "https://i.scdn.co/image/ab67616d0000b27301ed248b4ac01c868e688322",
    "https://i.scdn.co/image/ab67616d0000b2737e8045e318486885fe243817",
    "https://i.scdn.co/image/ab67616d0000b2734d08fc99eff4ed52dfce91fa",
    "https://i.scdn.co/image/ab67616d0000b2737cef65b561af10a25acbc2df",
    "https://i.scdn.co/image/ab67616d0000b27309880a7b8636c5a0615dc0c8",
    "https://i.scdn.co/image/ab67616d0000b273dac4efc0ebdfd9d92f127129",
    "https://i.scdn.co/image/ab67616d0000b2730f6ce5c138493ac768d9afc8",
    "https://i.scdn.co/image/ab67616d0000b273a7865e686c36a4adda6c9978",
    "https://i.scdn.co/image/ab67616d0000b27390b8a540137ee2a718a369f9",
    "https://i.scdn.co/image/ab67616d0000b273d2675cb6847d1b1da9fc28a3",
    "https://i.scdn.co/image/ab67616d0000b27325a4df452a3c42ccc2e9288b",
    "https://i.scdn.co/image/ab67616d0000b2735a0fca95bfacb33ca3580a29",
    "https://i.scdn.co/image/ab67616d0000b273b414c63fb435b622238c15ed",
    "https://i.scdn.co/image/ab67616d0000b273dac4efc0ebdfd9d92f127129",
    "https://i.scdn.co/image/ab67616d0000b2730e987064364e2b62ae1925b4",
    "https://i.scdn.co/image/ab67616d0000b273ede118b5f0e159dd18d42b90",
    "https://i.scdn.co/image/ab67616d0000b2735be5f807f6f0549e198a44b4",
    "https://i.scdn.co/image/ab67616d0000b273d514470784e3d02ee0bcdb80",
    "https://i.scdn.co/image/ab67616d0000b27319db9ac54c80a898a179f0f1",
    "https://i.scdn.co/image/ab67616d0000b273cf1fee2a55e98e22bf358512",
    "https://i.scdn.co/image/ab67616d0000b2730a7d45a345534966a4ad2c39",
    "https://i.scdn.co/image/ab67616d0000b27328581cfe196c266c132a9d62",
    "https://i.scdn.co/image/ab67616d0000b2737027294551db4fda68b5ddac",
    "https://i.scdn.co/image/ab67616d0000b2737027294551db4fda68b5ddac",
    "https://i.scdn.co/image/ab67616d0000b2737027294551db4fda68b5ddac",
    "https://i.scdn.co/image/ab67616d0000b2737027294551db4fda68b5ddac",
    "https://i.scdn.co/image/ab67616d0000b2737027294551db4fda68b5ddac",
    "https://i.scdn.co/image/ab67616d0000b2737027294551db4fda68b5ddac",
    "https://i.scdn.co/image/ab67616d0000b2737027294551db4fda68b5ddac",
    "https://i.scdn.co/image/ab67616d0000b2737027294551db4fda68b5ddac",
    "https://i.scdn.co/image/ab67616d0000b2738a6dbac0b74bd2484189ea5f",
    "https://i.scdn.co/image/ab67616d0000b2738a6dbac0b74bd2484189ea5f",
    "https://i.scdn.co/image/ab67616d0000b2738a6dbac0b74bd2484189ea5f",
    "https://i.scdn.co/image/ab67616d0000b2738a6dbac0b74bd2484189ea5f",
    "https://i.scdn.co/image/ab67616d0000b2738a6dbac0b74bd2484189ea5f",
    "https://i.scdn.co/image/ab67616d0000b2738a6dbac0b74bd2484189ea5f",
    "https://i.scdn.co/image/ab67616d0000b2738a6dbac0b74bd2484189ea5f",
    "https://i.scdn.co/image/ab67616d0000b2738a6dbac0b74bd2484189ea5f",
    "https://i.scdn.co/image/ab67616d0000b2738a6dbac0b74bd2484189ea5f",
    "https://i.scdn.co/image/ab67616d0000b273582d56ce20fe0146ffa0e5cf",
    "https://i.scdn.co/image/ab67616d0000b273582d56ce20fe0146ffa0e5cf",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b2734ce8b4e42588bf18182a1ad2",
    "https://i.scdn.co/image/ab67616d0000b273bd0c47e4cfb4ee327e53bc73",
]
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

function Version2({
    albums,
    currentIndex,
}: {
    albums: Album[];
    currentIndex: number;
}) {
    const transition = " transition-all duration-300 ";

    return (
        <div className="relative w-full h-full max-h-[300px]">
            {albums.map((album, index) => {
                let distanceFromCenter = Math.abs(index - currentIndex);
                let neg = index > currentIndex ? -1 : 1;

                if (distanceFromCenter > 4) {
                    distanceFromCenter =
                        albums.length - Math.abs(index - currentIndex);
                    neg = neg = index > currentIndex ? 1 : -1;
                }

                let scale = `${1 - distanceFromCenter * 0.1}`; // Escalado en función de la distancia al centro
                const zIndex = 20 - distanceFromCenter; // Profundidad dinámica
                let left = `${50 + distanceFromCenter * neg * -9}%`; // Separación horizontal
                let brightness = 1 - distanceFromCenter * 0.2; // Brillo en función de la distancia al centro

                if (distanceFromCenter > 4) {
                    scale = "0";
                    distanceFromCenter = 4;
                    left = `${50 + distanceFromCenter * neg * -9}%`; // Separación horizontal
                    brightness = 1 - distanceFromCenter * 0.2; // Brillo en función de la distancia al centro
                }

                return (
                    <div
                        key={album.id}
                        className={
                            "h-full w-auto aspect-square absolute -translate-x-1/2 origin-center" +
                            transition
                        }
                        style={{ left: left, zIndex: zIndex }}
                    >
                        <div
                            className={
                                "h-full w-auto rounded-lg overflow-hidden bg-black relative" +
                                transition
                            }
                            style={{
                                scale: scale,
                            }}
                        >
                            <img
                                src={album.image}
                                className={`${transition} top-1/2 relative -translate-y-1/2`}
                                style={{ filter: `brightness(${brightness})` }}
                            />
                            <div
                                className={`absolute  left-0 right-0 bottom-0 bg-gradient-to-b from-transparent to-black rounded-none ${transition} ${
                                    index == currentIndex ? "h-20" : "h-0"
                                }`}
                            />

                            <label
                                className={`absolute bottom-9 text-2xl left-2 font-bold ${
                                    index == currentIndex
                                        ? "opacity-100"
                                        : "opacity-0"
                                } ${transition}`}
                            >
                                {album.title}
                            </label>

                            <label
                                className={`absolute bottom-2 left-2 text-xl font-semibold ${
                                    index == currentIndex
                                        ? "opacity-100"
                                        : "opacity-0"
                                } ${transition}`}
                            >
                                {album.artist}
                            </label>
                            <button
                                className="absolute bottom-4 backdrop-blur-sm right-4 bg-transparent text-white p-3 rounded-full hover:bg-black/40 transition duration-300"
                                onClick={() => alert("Play button clicked")}
                            >
                                <Play
                                    className={`${transition} ${
                                        index == currentIndex
                                            ? "h-5 w-5"
                                            : "h-0 w-0"
                                    }
                                    `}
                                />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
export default function AlbumsCarousel() {
    const albums = Array(20)
        .fill(1)
        .map((_, index) => {
            return {
                id: index,
                title: `Title ${index}`,
                artist: `Artist ${index}`,
                image: images[index],
            };
        });
    const [currentIndex, setCurrentIndex] = useState(0);
    const [scrollIndex, setScrollIndex] = useState(0);
    const lastScrollIndex = useRef(0);
    const divRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!divRef.current) {
            return;
        }
        const handleScroll = (event: WheelEvent) => {
            if (event.deltaX) {
                event.stopPropagation();
                event.preventDefault();
                // console.log("1", event.deltaX);
                setScrollIndex((value) => (value += event.deltaX));
            }
        };

        divRef.current?.addEventListener("wheel", handleScroll);
    }, [divRef]);

    useEffect(() => {
        console.log(scrollIndex);

        if (Math.abs(lastScrollIndex.current - scrollIndex) > 500) {
            console.log("AADSFSADF");
            if (lastScrollIndex.current - scrollIndex > 0) {
                setCurrentIndex((value) =>
                    value > 0 ? value - 1 : albums.length - 1
                );
            } else {
                setCurrentIndex((value) =>
                    value < albums.length - 1 ? value + 1 : 0
                );
            }
            lastScrollIndex.current = scrollIndex;

        }
    }, [scrollIndex]);

    return (
        <div
            className="text-white h-1/2 flex items-center justify-center overflow-x-hidden relative select-none"
            ref={divRef}
        >
            <ChevronLeft
                className="z-30 absolute left-32 h-48 w-10 text-[#6d6d6d] hover:text-white p-2 rounded-full transition duration-300"
                onClick={() =>
                    setCurrentIndex((value) =>
                        value > 0 ? value - 1 : albums.length - 1
                    )
                }
            />
            <Version2 albums={albums} currentIndex={currentIndex} />

            <ChevronRight
                className="z-30 absolute right-32 h-48 w-10 text-[#6d6d6d] hover:text-white p-2 rounded-full transition duration-300"
                onClick={() =>
                    setCurrentIndex((value) =>
                        value < albums.length - 1 ? value + 1 : 0
                    )
                }
            />
        </div>
    );
}
