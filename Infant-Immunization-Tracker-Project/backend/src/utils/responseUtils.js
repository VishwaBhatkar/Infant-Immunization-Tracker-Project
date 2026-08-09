/**
 * File: backend/src/utils/responseUtils.js
 * Purpose: Provides reusable helper functions shared across multiple modules.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
export const ok=(res,data,message='Success',status=200)=>res.status(status).json({success:true,message,data});