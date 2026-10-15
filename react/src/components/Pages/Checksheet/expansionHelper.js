import { useState } from "react"

export default function useExpansionHelper() {
    const [expansionStructure, setExpansionStructure] = useState({});

    function isExpanded(year, focus = null) {
        if (focus === null) {
            // Checking if year expanded
            return !!(expansionStructure[year]?.expanded);
        } else {
            // Checking if focus expanded
            return !!(expansionStructure[year]?.focuses[focus]);
        }
    }

    function expand(year, focus = null) {
        if (focus === null) {
            // Expanding year
            if (expansionStructure[year]) {
                setExpansionStructure({
                    ...expansionStructure,
                    [year]: {
                        expanded: true,
                        focuses: expansionStructure[year].focuses
                    }
                });
            } else {
                setExpansionStructure({
                    ...expansionStructure,
                    [year]: {
                        expanded: true,
                        focuses: {}
                    }
                });
            }
        } else {
            // Expanding focus
            if (expansionStructure[year]) {
                setExpansionStructure({
                    ...expansionStructure,
                    [year]: {
                        expanded: true,
                        focuses: {
                            ...expansionStructure[year].focuses,
                            [focus]: true
                        }
                    }
                });
            } else {
                setExpansionStructure({
                    ...expansionStructure,
                    [year]: {
                        expanded: true,
                        focuses: {
                            [focus]: true
                        }
                    }
                });
            }
        }
    }

    function collapse(year, focus = null) {
        if (focus === null) {
            // Collapsing year
            if (expansionStructure[year]) {
                setExpansionStructure({
                    ...expansionStructure,
                    [year]: {
                        expanded: false,
                        focuses: expansionStructure[year].focuses
                    }
                })
            }
        } else {
            // Collapsing focus
            if (expansionStructure[year]) {
                const { [focus]: _, ...focusRemoved } = expansionStructure[year].focuses;
                setExpansionStructure({
                    ...expansionStructure,
                    [year]: {
                        ...expansionStructure[year],
                        focuses: focusRemoved
                    }
                });
            }
        }

    }

    return [isExpanded, expand, collapse];
}
