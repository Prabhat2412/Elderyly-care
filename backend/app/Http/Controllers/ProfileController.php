<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        return response()->json($request->user()->load(['medicalProfile', 'caretakers', 'family']));
    }

    public function update(Request $request)
    {
        $user = $request->user();
        $rules = [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $user->id,
            'hospital_name' => 'nullable|string|max:255',
            'hospital_contact' => 'nullable|string|max:255',
        ];
        if ($request->has('email') && $request->email !== $user->email) {
            $rules['current_password'] = 'required|string';
        }
        $validated = $request->validate($rules);
        if (isset($validated['current_password']) && !Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['error' => 'Current password is incorrect.'], 403);
        }
        $user->update($validated);
        return response()->json($user);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);
        $user = $request->user();
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['error' => 'Current password is incorrect.'], 403);
        }
        $user->update(['password' => Hash::make($request->new_password)]);
        return response()->json(['message' => 'Password changed successfully.']);
    }
}
