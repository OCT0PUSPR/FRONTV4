import React, { useState } from 'react'
import { testBackendConnection, testAllEndpoints } from '../utils/testBackend'

export function BackendDebug() {
  const [testResults, setTestResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const runTests = async () => {
    setIsLoading(true)
    try {
      const basicTest = await testBackendConnection()
      const allTests = await testAllEndpoints()
      
      setTestResults({
        basic: basicTest,
        all: allTests
      })
    } catch (error) {
      console.error('Test failed:', error)
      setTestResults({ error: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Backend Debug Tool</h3>
      
      <button
        onClick={runTests}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Testing...' : 'Test Backend Endpoints'}
      </button>

      {testResults && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Test Results:</h4>
          
          {testResults.basic && (
            <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
              <h5 className="font-medium">Basic Connection Test:</h5>
              <p>Status: {testResults.basic.status}</p>
              <p>Running: {testResults.basic.isRunning ? 'Yes' : 'No'}</p>
              {testResults.basic.error && (
                <p className="text-red-600">Error: {testResults.basic.error}</p>
              )}
            </div>
          )}

          {testResults.all && (
            <div className="mb-4">
              <h5 className="font-medium mb-2">All Endpoints Test:</h5>
              <div className="space-y-2">
                {testResults.all.map((result: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded">
                    <span className="font-mono text-sm">{result.endpoint}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      result.status === 200 ? 'bg-green-100 text-green-800' :
                      result.status === 404 ? 'bg-red-100 text-red-800' :
                      result.status === 500 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {testResults.error && (
            <div className="p-3 bg-red-100 text-red-800 rounded">
              Error: {testResults.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
