# MAKSR Source Recovery Record

## Objective
Recover and preserve the exact source that currently serves the live MAKSR production experience before converting the deployment lifecycle to Git-connected production.

## Current verified state
- Authoritative private GitHub repository: `maksr2030/MAKSR-Platform-Production`
- Default branch: `main`
- Primary production domain: `maksr.com`
- The live production site is currently serving independently of this repository.
- No production application source has yet been committed to this repository.

## Cutover gate
Do not point production deployment automation at this repository until one of the following is true:
1. The exact source used by the current live deployment has been recovered and committed; or
2. A candidate source has been proven equivalent through visual, functional, routing, language, responsive-layout, and domain tests.

## Required recovery evidence
- Exact source files or verifiable source archive
- Production deployment identity and timestamp
- Source hash or commit reference, where available
- Domain routing state for apex and `www`
- Functional parity test record
- Mobile visual parity record
- Arabic and English route verification
- Final production deployment reference

## Current connector limitation
The currently connected Vercel integration does not resolve the existing `maksr-mvp` project through the available project/team lookup. Production remains untouched until this visibility gap is resolved.
