import { useRouter } from "expo-router";

type RouteInput =
    | string
    | { pathname: string; params?: Record<string, string> };

export function useTypedRouter() {
    const router = useRouter();

    const push = (route: RouteInput) => {
        router.push(route as never);
    };

    const replace = (route: RouteInput) => {
        router.replace(route as never);
    };

    const back = () => {
        router.back();
    };

    return { push, replace, back, router };
}
