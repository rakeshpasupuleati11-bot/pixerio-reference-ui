@echo off
setlocal
cd /d "%~dp0"

set "MSG=%~1"
if "%MSG%"=="" set "MSG=Daily work"

echo.
echo [1/3] Staging all changes...
git add -A

git diff --cached --quiet
if errorlevel 1 goto commit

echo [2/3] Nothing changed since the last push - nothing to commit.
goto done

:commit
echo [2/3] Committing: %MSG%
git commit -m "%MSG%"
if errorlevel 1 goto fail

echo [3/3] Pushing to GitHub...
git push
if errorlevel 1 goto fail

echo.
echo OK - pushed. The live site updates in about 40 seconds:
echo https://rakeshpasupuleati11-bot.github.io/pixerio-reference-ui/
goto done

:fail
echo.
echo FAILED - read the errors above. Nothing was pushed.

:done
echo.
if not defined PUBLISH_NO_PAUSE pause
endlocal
