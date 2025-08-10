import { Request } from "express";
import { Permission } from "../src/utils/permissionInterface.ts";

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                firstName?: string | null;
                lastName: string;
                email: string;
                emailStatus?: string;
                panStatus?: string | null;
                mobileNumber?: string;
                pan?: string | null;
                userRoles:
                    | "None"
                    | "Staff_Manager"
                    | "Admin"
                    | "Client"
                    | "Professional"
                    | "Retailer"
                    | "Mediator";
            };
            permission?: Permission?;
            userRoleId: string | null;
        }
    }
}
console.log("express.d.ts loaded!");
