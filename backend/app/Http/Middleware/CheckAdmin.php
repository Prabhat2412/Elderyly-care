<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
class CheckAdmin
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['error' => 'Unauthorized. Admin access required.'], 403);
        }
        return $next($request);
    }
}
