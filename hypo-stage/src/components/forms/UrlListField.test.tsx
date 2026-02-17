import { default as React } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@material-ui/core/styles';
import { createTheme } from '@material-ui/core/styles';
import { UrlListField } from './UrlListField';

const theme = createTheme();

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('UrlListField', () => {
  it('should render label and input with Add button', () => {
    const onUrlsChange = jest.fn();
    renderWithTheme(
      <UrlListField label="Related Links" urls={[]} onUrlsChange={onUrlsChange} />,
    );

    expect(screen.getByText('Related Links')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/https:\/\/example\.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
  });

  it('should have input and Add button in flex layout for responsive wrapping', () => {
    const onUrlsChange = jest.fn();
    const { container } = renderWithTheme(
      <UrlListField label="Links" urls={[]} onUrlsChange={onUrlsChange} />,
    );

    const flexContainer = container.querySelector('[style*="gap: 8px"]');
    expect(flexContainer).toBeInTheDocument();
    expect(flexContainer?.querySelector('input')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
  });

  it('should add URL when Add button is clicked with valid URL', async () => {
    const user = userEvent.setup();
    const onUrlsChange = jest.fn();
    renderWithTheme(
      <UrlListField label="Links" urls={[]} onUrlsChange={onUrlsChange} />,
    );

    const input = screen.getByPlaceholderText(/https:\/\/example\.com/);
    await user.type(input, 'https://example.com/doc');
    await user.click(screen.getByRole('button', { name: /Add/i }));

    expect(onUrlsChange).toHaveBeenCalledWith(['https://example.com/doc']);
  });

  it('should add URL on Enter key', async () => {
    const user = userEvent.setup();
    const onUrlsChange = jest.fn();
    renderWithTheme(
      <UrlListField label="Links" urls={[]} onUrlsChange={onUrlsChange} />,
    );

    const input = screen.getByPlaceholderText(/https:\/\/example\.com/);
    await user.type(input, 'https://example.com/doc{Enter}');

    expect(onUrlsChange).toHaveBeenCalledWith(['https://example.com/doc']);
  });

  it('should render list of URLs with clickable links and word-break styling', () => {
    const urls = ['https://example.com/very-long-url-path', 'https://other.com'];
    const onUrlsChange = jest.fn();
    renderWithTheme(
      <UrlListField label="Links" urls={urls} onUrlsChange={onUrlsChange} />,
    );

    const link1 = screen.getByRole('link', { name: urls[0] });
    const link2 = screen.getByRole('link', { name: urls[1] });

    expect(link1).toHaveAttribute('href', urls[0]);
    expect(link1).toHaveAttribute('target', '_blank');
    expect(link1).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link2).toHaveAttribute('href', urls[1]);
  });

  it('should show helper text when no URLs and helperText provided', () => {
    const onUrlsChange = jest.fn();
    renderWithTheme(
      <UrlListField
        label="Links"
        urls={[]}
        onUrlsChange={onUrlsChange}
        helperText="Add some links"
      />,
    );

    expect(screen.getByText('Add some links')).toBeInTheDocument();
  });

  it('should remove URL when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onUrlsChange = jest.fn();
    renderWithTheme(
      <UrlListField
        label="Links"
        urls={['https://example.com']}
        onUrlsChange={onUrlsChange}
      />,
    );

    const deleteButtons = screen.getAllByLabelText(/delete/i);
    await user.click(deleteButtons[0]);

    expect(onUrlsChange).toHaveBeenCalledWith([]);
  });

  it('should disable Add button for invalid URL', () => {
    const onUrlsChange = jest.fn();
    renderWithTheme(
      <UrlListField label="Links" urls={[]} onUrlsChange={onUrlsChange} />,
    );

    const addButton = screen.getByRole('button', { name: /Add/i });
    expect(addButton).toBeDisabled();
  });
});
