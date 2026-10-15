import React, {useState, useEffect} from "react";
import "./../../../css/ForceAddAdmin.css";
import "./../../../css/Forms.css";
import axios from 'axios';
import AdminTermTable from "./Grad_AdminTermTable";
import { statusIsGood } from "../../../helpers/http";

export default function Grad_ForceAddAdmin() {
    const [terms, setTerms] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);

    //Fetch terms on load
    useEffect(() => {
        try {
            axios.get("/api/grad/term")
            .then((response) => {
                const termsData = response.data.terms || [];
                setTerms(termsData);
                axios.get("/api/grad/timetable")
                .then(() => {
                    setIsLoaded(true);
                }).catch((error) => {
                    console.error("Error getting terms: ", error);
                })
            }).catch((error) => {
                console.error("Error getting terms: ", error);
            })
        } catch (error) {
            console.error("Error getting terms: ", error);
        }
    }, [])

    const dropTerm = ( termcode ) => {
        if(!window.confirm(`Are you sure you would like to drop the ${termcode} term? This will remove all sections associated with the term and cannot be undone.`))
            return;
        console.log("Dropping "+termcode+" Term");
        axios.post("/api/grad/term/drop", {termcode})
        .then((response) => {
            if(statusIsGood(response.status)) {
                document.getElementById(termcode+"-div").remove();
                console.log("Successfully Dropped "+termcode+" Term");
            } else {
                console.error(`Failed to Drop ${termcode} Term`);
            }
        }).catch((error) => {
            console.error(`Failed to Drop ${termcode} Term: ${error}`)
        })
    }

    const changeDates = (termcode, open, close) => {
        if(open == null || open === "" || close == null || close === "") {
            alert("Term must have both an open and close date set");
            return;
        }
        console.log("Update term:"+termcode+" to open on "+open+" and close on "+close);
        axios.post(
            "/api/grad/term/dates",
            {
                termcode,
                open,
                close
            }
        ).then((response) => {
            if(statusIsGood(response.status)) {
                const newTerms = terms.map((t) => {
                    if(t.termcode == termcode) {
                        return {termcode: t.termcode, open: open, close: close}
                    } else {
                        return {termcode: t.termcode, open: t.open, close: t.close}
                    }
                });
                setTerms(newTerms);
                console.log("Successfully updated term dates");
            } else {
                console.error(`Failed to update ${termcode} to open on ${open} and close on ${close}`)
            }
        }).catch((error) => {
            console.error(`Failed to update ${termcode} to open on ${open} and close on ${close}: ${error}`)
        }) 
    }



    return (
        <div className="page-body">
        {isLoaded && (
            <>
            <h1>Force Add Admin</h1>
            {terms.map((term) => (
                <AdminTermTable term={term} changeDates={changeDates} dropTerm={dropTerm}/>
            ))}
            </>
            )}
        </div>
    );
}