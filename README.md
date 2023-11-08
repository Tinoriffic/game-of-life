## The Game of Life

### Quick Start
`npm start` - runs the react app in development mode. Execute the command from the `frontend/` directory. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.
You may also see any lint errors in the console.

`source venv/Scripts/activate` - activates the virtual environment for FastAPI

`python -m app.main` - starts the local backend server (do this in the venv). Execute the command from the `backend/` directory. Open [http://127.0.0.1:8000/endpoint](http://127.0.0.1:8000/endpoint) to view it in your browser.

To test your endpoints see [http://localhost:8000/docs](http://localhost:8000/docs)

### Other
`npm test` - Launches the test runner in the interactive watch mode.

`npm run build` - Builds the app for production to the `build` folder.
It correctly bundles React in production mode and optimizes the build for the best performance. The build is minified and the filenames include the hashes.


`npm run eject` - **Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.