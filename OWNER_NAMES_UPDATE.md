# Owner Full Names Configuration

## Quick Update Needed

I've set up Max McCaulley's full name in the system. To add the other owners' full names, update this section in `server.js`:

**Current (line 64-70):**
```javascript
const OWNER_NAMES = {
    'max@guttersnapchicago.com': 'Max McCaulley',
    'josh@guttersnapchicago.com': 'Josh [LastName]',
    'matt@guttersnapchicago.com': 'Matt [LastName]',
    'ian@guttersnapchicago.com': 'Ian [LastName]',
    'brody@guttersnapchicago.com': 'Brody [LastName]'
};
```

**Replace [LastName] with actual last names:**
```javascript
const OWNER_NAMES = {
    'max@guttersnapchicago.com': 'Max McCaulley',
    'josh@guttersnapchicago.com': 'Josh Smith',      // ← Add real last name
    'matt@guttersnapchicago.com': 'Matt Johnson',    // ← Add real last name
    'ian@guttersnapchicago.com': 'Ian Williams',     // ← Add real last name
    'brody@guttersnapchicago.com': 'Brody Davis'     // ← Add real last name
};
```

## Where Full Names Appear:

- Contract letterhead
- Representative signature on contracts
- Email footers
- Contract terms section

This makes the contracts and emails more professional and personal!


