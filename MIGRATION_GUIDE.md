# Migration from Vine.js to Zod

This document outlines the changes made to migrate the codebase from Vine.js to Zod for validation.

## Changes Made

### 1. Dependencies

- **Removed**: `@vinejs/vine` dependency
- **Already present**: `zod` (was already in dependencies)

### 2. Files Modified

#### `src/validator/auth.ts`

- **Before**: Used `vine.compile()` with Vine.js schemas
- **After**: Uses Zod schemas with `z.object()`, `z.string()`, `z.enum()`, etc.
- **Key changes**:
  - Replaced `vine.string().confirmed()` with `z.string()` and `.refine()` for password confirmation
  - Replaced `vine.string().fixedLength().regex()` with `z.string().length().regex()`
  - Replaced `vine.enum()` with `z.enum()`
  - Added custom error messages for better validation feedback

#### `src/controllers/authController.ts`

- **Before**: Used `await schema.validate(data)`
- **After**: Uses `schema.parse(data)` (synchronous)
- **Key changes**:
  - Replaced all `compiledUserSchema.validate()` calls with `userSchema.parse()`
  - Replaced all `await schema.validate()` calls with `schema.parse()`
  - Updated import from `compiledUserSchema` to `userSchema`

#### `src/middleware/errorHandler.ts`

- **Before**: Only handled Vine.js validation errors (`E_VALIDATION_ERROR`)
- **After**: Handles both Zod validation errors and legacy Vine.js errors (for backward compatibility)
- **Key changes**:
  - Added `ZodError` import
  - Added specific handling for `ZodError` instances
  - Maintained backward compatibility with Vine.js error handling

#### `tsconfig.json`

- **Before**: Had path mapping for `@vinejs/vine/types`
- **After**: Removed Vine.js path mapping
- **Key changes**:
  - Removed `paths` configuration for Vine.js types

### 3. New Files Created

#### `src/validator/candidate.ts`

- Created comprehensive validation schemas for candidate-related operations
- Includes schemas for:
  - Candidate profile creation and updates
  - Education creation and updates
  - Profile creation and updates
  - Parameter validation for IDs
- Uses Zod's advanced features like `.refine()` for custom validation logic

## Benefits of Migration

### 1. Performance

- Zod validation is synchronous (no need for `await`)
- Better TypeScript integration and type inference
- Smaller bundle size

### 2. Developer Experience

- Better TypeScript support with automatic type inference
- More intuitive API
- Better error messages and customization
- Easier to compose and extend schemas

### 3. Maintainability

- More active community and development
- Better documentation
- Easier to test and debug
- More consistent API across different validation scenarios

## Error Handling

### Before (Vine.js)

```typescript
if (err.code === "E_VALIDATION_ERROR") {
  res.status(400).json({ success: false, message: err.messages });
}
```

### After (Zod)

```typescript
if (err instanceof ZodError) {
  const errors = err.errors.map((error) => ({
    field: error.path.join("."),
    message: error.message,
  }));
  res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: errors,
  });
}
```

## Usage Examples

### Registration Schema

```typescript
export const userSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be less than 128 characters"),
    password_confirmation: z.string(),
    name: z
      .string()
      .min(1, "Name is required")
      .max(64, "Name must be less than 64 characters"),
    role: z.enum(["CANDIDATE", "COMPANY"], {
      errorMap: () => ({ message: "Role must be either CANDIDATE or COMPANY" }),
    }),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords don't match",
    path: ["password_confirmation"],
  });
```

### Validation in Controller

```typescript
static async register(req: AuthRequest, res: Response) {
  const validatedData = userSchema.parse(req.body);
  const { email, password, name, role } = validatedData;
  // ... rest of the logic
}
```

## Testing the Migration

1. Build the project: `npm run build`
2. Run the server: `npm run dev`
3. Test validation endpoints with invalid data to ensure error handling works correctly
4. Verify that all existing functionality still works as expected

## Future Enhancements

1. Add more specific validation schemas for candidate operations
2. Implement validation middleware for automatic request validation
3. Add schema composition for complex validation scenarios
4. Consider adding schema caching for performance optimization
