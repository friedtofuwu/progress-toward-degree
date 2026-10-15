import { useEffect, useRef } from "react";

export default function useIsMounted() {
    const mounted = useRef(false);

    useEffect(() => {
        mounted.current = true;

        return () => {
            mounted.current = false;
        };
    }, []);

    /**
     * @returns True if the current component is mounted, false otherwise.
     */
    function isMounted() {
        return mounted.current;
    }

    return isMounted;
}
