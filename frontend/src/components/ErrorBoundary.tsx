import { Component, type ErrorInfo, type ReactNode } from 'react'
import ErrorPage from './ErrorPage'
import type { Language, TFunction } from '../i18n'

interface ErrorBoundaryProps {
  children: ReactNode
  language: Language
  onLanguageChange: (language: Language) => void
  t: TFunction
}

interface ErrorBoundaryState {
  hasError: boolean
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application error', error, info)
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps) {
    if (previousProps.language !== this.props.language && this.state.hasError) this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) return <ErrorPage language={this.props.language} onLanguageChange={this.props.onLanguageChange} reason="error" t={this.props.t} />
    return this.props.children
  }
}
